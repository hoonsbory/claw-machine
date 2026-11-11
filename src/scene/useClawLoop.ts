import { useFrame } from '@react-three/fiber';
import { useBeforePhysicsStep } from '@react-three/rapier';
import { useEffect, useRef, type RefObject } from 'react';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import { createClawState, forgetDolls, getHoldHeight, markWin, stepClaw, type ClawDeps } from '../game/clawMachine';
import { getCabinetLayout, isInsideChute } from '../game/dollGeometry';
import { createDollLookup } from '../game/grabJudge';
import { clamp } from '../game/math';
import type { ClawEvent, ClawPhase, ClawState, DollKind, DollSnapshot, Vec2 } from '../game/types';
import type { MoveInput } from '../input/useMoveInput';
import type { GameSession } from '../session/useGameSession';
import type { DollHandle } from './Doll';
import { CLAW_VIEW_FRAME_PRIORITY } from './frameOrder';

/** 화면에 그릴 집게. x·z 는 판정에 쓰는 실제 위치, shownX·shownZ 는 줄 흔들림이 더해진 보이는 위치다. */
export interface ClawView {
  x: number;
  z: number;
  shownX: number;
  shownZ: number;
  hubY: number;
  closeAmount: number;
  isHolding: boolean;
  phase: ClawPhase;
}

interface ClawLoopArgs {
  input: MoveInput;
  session: GameSession;
  dolls: Map<string, DollHandle>;
  kindOf: (dollId: string) => DollKind;
  onEvent: (event: ClawEvent) => void;
}

/**
 * 집게 상태 흐름을 물리 세계와 잇는다. 물리 한 단계 직전마다 같은 시간(physics.timeStep)만큼 집게를 진행해
 * 인형 위치 읽기 → 상태 진행 → 들고 있는 인형 끌어당기기 → 배출구 획득 확인을 한다.
 * 돌려주는 view 는 매 프레임 앞뒤 물리 단계 사이를 보간한 집게 모양이다. 상태는 모두 ref 에 두고,
 * React 상태는 단계가 바뀔 때와 획득할 때만 session 을 통해 바뀐다.
 */
export function useClawLoop({ input, session, dolls, kindOf, onEvent }: ClawLoopArgs): RefObject<ClawView> {
  const claw = useRef<ClawState>(INITIAL_STATE);
  const sway = useRef<Sway>(INITIAL_SWAY);
  const poses = useRef<PoseHistory>(INITIAL_POSES);
  // 이 루프가 획득으로 지운 인형. 사라지는 연출 동안 손잡이가 남아 있어도 다시 집거나 획득하지 않는다.
  // session.vanishingIds 는 다시 그려진 뒤에야 바뀌므로 바로 다음 물리 단계부터 빼려면 여기 따로 둔다.
  const removedIds = useRef(new Set<string>());
  const sinceLastStep = useRef(0);
  const view = useRef<ClawView>(INITIAL_VIEW);

  useBeforePhysicsStep((): void => {
    const before = claw.current;
    const snapshots = readDolls(dolls, removedIds.current, kindOf);
    const { state, events } = stepClaw(
      before,
      { move: input.readMove(), dropRequested: input.takeDropRequest(), dolls: snapshots, dt: TIME_STEP },
      DEPS,
    );
    for (const event of events) onEvent(event);
    if (state.phase !== before.phase) session.setPhase(state.phase);

    const nextSway = followSway(sway.current, state, TIME_STEP);
    pullHeldDoll(state, nextSway, dolls);

    let next = state;
    for (const snapshot of snapshots) {
      if (!isChuteArrival(snapshot, next, dolls)) continue;
      const removed = session.reportChuteArrival(snapshot.id);
      if (removed === null) continue;

      for (const id of removed) removedIds.current.add(id);
      next = forgetDolls(markWin(next), removed);
    }

    claw.current = next;
    sway.current = nextSway;
    poses.current = { previous: poses.current.current, current: poseOf(next, nextSway) };
  });

  // 이번 프레임의 물리 단계가 끝난 뒤, 집게 모양을 그리기 전에 돈다(frameOrder.ts)
  useFrame((_, delta): void => {
    sinceLastStep.current = advanceSinceLastStep(sinceLastStep.current, delta);
    view.current = blendView(poses.current, sinceLastStep.current / TIME_STEP, claw.current);
  }, CLAW_VIEW_FRAME_PRIORITY);

  // 개발 서버에서만 브라우저 점검용으로 읽기 창구를 연다. 배포 빌드에는 들어가지 않는다.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__clawDebug = {
      readState: (): ClawState => claw.current,
      readView: (): ClawView => view.current,
      readDolls: (): DollSnapshot[] => readDolls(dolls, removedIds.current, kindOf),
    };
    return (): void => {
      delete window.__clawDebug;
    };
  }, [dolls, kindOf]);

  return view;
}

/** 줄에 매달린 흔들림. 보이는 위치가 실제 위치를 스프링으로 따라간다. */
interface Sway {
  shownX: number;
  shownZ: number;
  velocityX: number;
  velocityZ: number;
}

/** 물리 한 단계가 끝났을 때의 집게 모양 */
type ClawPose = Pick<ClawView, 'x' | 'z' | 'shownX' | 'shownZ' | 'hubY' | 'closeAmount'>;

/** 마지막 두 물리 단계의 집게 모양. 그 사이를 보간해 그린다. */
interface PoseHistory {
  previous: ClawPose;
  current: ClawPose;
}

/** 개발 중 브라우저에서 집게 상태와 인형 위치를 읽어 보는 창구. 읽기만 한다. */
interface ClawDebugHandle {
  readState(): ClawState;
  readView(): ClawView;
  readDolls(): DollSnapshot[];
}

declare global {
  interface Window {
    __clawDebug?: ClawDebugHandle;
  }
}

const LAYOUT = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
const DEPS: ClawDeps = { config: GAME_CONFIG, lookup: createDollLookup(DOLL_KINDS, GAME_CONFIG), layout: LAYOUT, rng: Math.random };
const TIME_STEP = GAME_CONFIG.physics.timeStep;
/** <Physics> 가 한 프레임 시간을 자르는 상한(라이브러리 안에 정해진 값). 물리 단계 사이 위치를 같은 방식으로 셈하려고 따라 쓴다. */
const PHYSICS_MAX_FRAME_DELTA = 0.5;

const INITIAL_STATE = createClawState(LAYOUT, GAME_CONFIG);
const INITIAL_SWAY: Sway = { shownX: INITIAL_STATE.x, shownZ: INITIAL_STATE.z, velocityX: 0, velocityZ: 0 };
const INITIAL_POSE = poseOf(INITIAL_STATE, INITIAL_SWAY);
const INITIAL_POSES: PoseHistory = { previous: INITIAL_POSE, current: INITIAL_POSE };
const INITIAL_VIEW = blendView(INITIAL_POSES, 1, INITIAL_STATE);

/** 이미 획득으로 지운 인형을 빼고 지금 위치를 읽는다 */
function readDolls(
  dolls: Map<string, DollHandle>,
  removedIds: ReadonlySet<string>,
  kindOf: (dollId: string) => DollKind,
): DollSnapshot[] {
  const snapshots: DollSnapshot[] = [];
  for (const [id, handle] of dolls) {
    if (removedIds.has(id)) continue;
    snapshots.push({ id, kindId: kindOf(id).id, ...handle.getPosition() });
  }
  return snapshots;
}

/** 보이는 위치가 실제 위치를 스프링으로 따라간다. 속도를 먼저 바꾸고 그 속도로 옮긴다. */
function followSway(sway: Sway, target: Vec2, dt: number): Sway {
  const { swayStiffness, swayDamping } = GAME_CONFIG.claw;
  const velocityX = sway.velocityX + ((target.x - sway.shownX) * swayStiffness - sway.velocityX * swayDamping) * dt;
  const velocityZ = sway.velocityZ + ((target.z - sway.shownZ) * swayStiffness - sway.velocityZ * swayDamping) * dt;
  return { shownX: sway.shownX + velocityX * dt, shownZ: sway.shownZ + velocityZ * dt, velocityX, velocityZ };
}

/** 들고 있는 인형을 매달릴 자리로 끌어당긴다. 흔들리는 보이는 위치를 따라가야 줄 끝에 매달린 것처럼 보인다. */
function pullHeldDoll(state: ClawState, sway: Sway, dolls: Map<string, DollHandle>): void {
  const holdY = getHoldHeight(state, DEPS);
  if (state.held === null || holdY === null) return;

  dolls.get(state.held.dollId)?.setVelocityToward({ x: sway.shownX, y: holdY, z: sway.shownZ }, GAME_CONFIG.grab.holdFollow);
}

/** 들려 있지 않은 인형이 배출구 바닥 가까이 들어갔는지. 처음 떨어지는 중인 인형은 다시 떨어뜨릴 인형이라 빼고 본다. */
function isChuteArrival(snapshot: DollSnapshot, state: ClawState, dolls: Map<string, DollHandle>): boolean {
  if (snapshot.id === state.held?.dollId) return false;
  if (!isInsideChute(snapshot, DEPS.lookup.metricsOf(snapshot.kindId), LAYOUT, GAME_CONFIG)) return false;
  return dolls.get(snapshot.id)?.isFirstFalling() === false;
}

function poseOf(state: ClawState, sway: Sway): ClawPose {
  return { x: state.x, z: state.z, shownX: sway.shownX, shownZ: sway.shownZ, hubY: state.hubY, closeAmount: state.closeAmount };
}

/**
 * 마지막 물리 단계 뒤로 흐른 시간. <Physics> 가 프레임 시간을 쌓아 단계를 도는 계산을 그대로 따라 해서,
 * 인형 모양이 보간되는 비율과 같은 비율로 집게를 보간한다.
 */
function advanceSinceLastStep(sinceLastStep: number, delta: number): number {
  let next = sinceLastStep + clamp(delta, 0, PHYSICS_MAX_FRAME_DELTA);
  while (next >= TIME_STEP) next -= TIME_STEP;
  return next;
}

function blendView({ previous, current }: PoseHistory, ratio: number, state: ClawState): ClawView {
  const blend = (key: keyof ClawPose): number => previous[key] + (current[key] - previous[key]) * ratio;
  return {
    x: blend('x'),
    z: blend('z'),
    shownX: blend('shownX'),
    shownZ: blend('shownZ'),
    hubY: blend('hubY'),
    closeAmount: blend('closeAmount'),
    isHolding: state.held !== null || state.pendingGrab !== null,
    phase: state.phase,
  };
}
