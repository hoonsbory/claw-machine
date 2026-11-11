import { useFrame } from '@react-three/fiber';
import { useBeforePhysicsStep } from '@react-three/rapier';
import { useEffect, useRef, type RefObject } from 'react';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import { applyTuning, type TuningOverrides } from '../config/runtimeTuning';
import { createClawState, forgetDolls, getHoldHeight, markWin, stepClaw, type ClawDeps } from '../game/clawMachine';
import { getCabinetLayout, isInsideChute } from '../game/dollGeometry';
import { createDollLookup } from '../game/grabJudge';
import { clamp } from '../game/math';
import { judgeChuteArrival, pickRespawnPoint, type ChuteVerdict } from '../game/spawn';
import type { ClawEvent, ClawPhase, ClawState, DollKind, DollSnapshot, Vec2 } from '../game/types';
import type { MoveInput } from '../input/useMoveInput';
import type { GameSession } from '../session/useGameSession';
import type { DollHandle } from './Doll';
import { CLAW_VIEW_FRAME_PRIORITY, PHYSICS_MAX_FRAME_DELTA } from './frameOrder';

/** 화면에 그릴 집게. x·z 는 판정에 쓰는 실제 위치, shownX·shownZ 는 줄 흔들림이 더해진 보이는 위치다. */
export interface ClawView {
  x: number;
  z: number;
  shownX: number;
  shownZ: number;
  hubY: number;
  closeAmount: number;
  /** 손가락을 인형을 쥔 모양(덜 오므린 모양)으로 그릴지. 놓는 동안에는 놓기 시작할 때의 값을 지킨다. */
  isHolding: boolean;
  phase: ClawPhase;
}

interface ClawLoopArgs {
  input: MoveInput;
  session: GameSession;
  dolls: Map<string, DollHandle>;
  kindOf: (dollId: string) => DollKind;
  onEvent: (event: ClawEvent) => void;
  /** 조정 패널에서 바꾼 집기 수치. 집게가 쉬고 있을 때만 바꿔 넣어 다음 시도부터 적용한다. */
  overrides: TuningOverrides;
  /** 연속 실패 수가 바뀔 때(시도가 끝나거나 뽑아서 끊길 때)만 불린다 */
  onFailStreakChange: (failStreak: number) => void;
}

/**
 * 집게 상태 흐름을 물리 세계와 잇는다. 물리 한 단계 직전마다 같은 시간(physics.timeStep)만큼 집게를 진행해
 * 인형 위치 읽기 → 상태 진행 → 들고 있는 인형 끌어당기기 → 배출구 획득 확인을 한다.
 * 돌려주는 view 는 매 프레임 앞뒤 물리 단계 사이를 보간한 집게 모양이다. 상태는 모두 ref 에 두고,
 * React 상태는 단계가 바뀔 때와 획득할 때(session), 연속 실패 수가 바뀔 때(onFailStreakChange)만 바뀐다.
 */
export function useClawLoop({
  input,
  session,
  dolls,
  kindOf,
  onEvent,
  overrides,
  onFailStreakChange,
}: ClawLoopArgs): RefObject<ClawView> {
  const claw = useRef<ClawState>(INITIAL_STATE);
  const tuning = useRef<LoopTuning>(DEFAULT_TUNING);
  const sway = useRef<Sway>(INITIAL_SWAY);
  const poses = useRef<PoseHistory>(INITIAL_POSES);
  const holdingPose = useRef(false);
  // 이 루프가 획득으로 지운 인형. 사라지는 연출 동안 손잡이가 남아 있어도 다시 집거나 획득하지 않는다.
  // session.vanishingIds 는 다시 그려진 뒤에야 바뀌므로 바로 다음 물리 단계부터 빼려면 여기 따로 둔다.
  const removedIds = useRef(new Set<string>());
  // 이 페이지를 연 뒤 내리기를 한 번이라도 요청했는지. 그 전에 배출구에 굴러 들어간 인형은 뽑은 것으로 치지 않는다.
  const hasDropped = useRef(false);
  const sinceLastStep = useRef(0);
  const view = useRef<ClawView>(INITIAL_VIEW);

  useBeforePhysicsStep((): void => {
    const before = claw.current;
    // 시도 도중에는 판정 수치를 바꾸지 않는다. 쉬는 동안 바꿔 넣으면 이번 단계에 시작하는 시도부터 새 값을 쓴다.
    const isNewTuning = tuning.current.overrides !== overrides;
    if (before.phase === 'idle' && isNewTuning) tuning.current = createLoopTuning(overrides);
    const { deps } = tuning.current;

    const snapshots = readDolls(dolls, removedIds.current, kindOf);
    const dropRequested = input.takeDropRequest();
    if (dropRequested) hasDropped.current = true;
    const { state, events } = stepClaw(before, { move: input.readMove(), dropRequested, dolls: snapshots, dt: TIME_STEP }, deps);
    for (const event of events) onEvent(event);
    if (state.phase !== before.phase) session.setPhase(state.phase);

    const nextSway = followSway(sway.current, state, TIME_STEP);
    pullHeldDoll(state, nextSway, dolls, deps);

    let next = state;
    for (const snapshot of snapshots) {
      const handle = dolls.get(snapshot.id);
      if (handle === undefined) continue;

      const verdict = judgeSnapshot(snapshot, next, handle, hasDropped.current, deps);
      if (verdict === 'redrop') handle.respawn(pickRespawnPoint(DOLL_KINDS.length, deps.layout, deps.config, Math.random));
      if (verdict !== 'win') continue;

      const removed = session.reportChuteArrival(snapshot.id);
      if (removed === null) continue;

      for (const id of removed) removedIds.current.add(id);
      next = forgetDolls(markWin(next), removed);
    }

    claw.current = next;
    holdingPose.current = getHoldingPose(holdingPose.current, next);
    sway.current = nextSway;
    poses.current = { previous: poses.current.current, current: poseOf(next, nextSway) };
    if (next.failStreak !== before.failStreak) onFailStreakChange(next.failStreak);
  });

  // 이번 프레임의 물리 단계가 끝난 뒤, 집게 모양을 그리기 전에 돈다(frameOrder.ts)
  useFrame((_, delta): void => {
    sinceLastStep.current = advanceSinceLastStep(sinceLastStep.current, delta);
    view.current = blendView(poses.current, sinceLastStep.current / TIME_STEP, claw.current, holdingPose.current);
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

/** 지금 시도에 쓰는 수치와 그 수치를 만든 조정 값 */
interface LoopTuning {
  overrides: TuningOverrides;
  deps: ClawDeps;
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
const DEFAULT_TUNING = createLoopTuning({});
const TIME_STEP = GAME_CONFIG.physics.timeStep;

const INITIAL_STATE = createClawState(LAYOUT, GAME_CONFIG);
const INITIAL_SWAY: Sway = { shownX: INITIAL_STATE.x, shownZ: INITIAL_STATE.z, velocityX: 0, velocityZ: 0 };
const INITIAL_POSE = poseOf(INITIAL_STATE, INITIAL_SWAY);
const INITIAL_POSES: PoseHistory = { previous: INITIAL_POSE, current: INITIAL_POSE };
const INITIAL_VIEW = blendView(INITIAL_POSES, 1, INITIAL_STATE, false);

/**
 * 조정 값을 얹은 설정과 그 설정으로 다시 만든 인형 표. 닿는 여유는 인형 표 안의 종류별 닿는 범위에 들어가므로 표도 새로 만든다.
 * 기계 배치는 조정 값과 상관없어 그대로 쓴다.
 */
function createLoopTuning(overrides: TuningOverrides): LoopTuning {
  const config = applyTuning(GAME_CONFIG, overrides);
  return { overrides, deps: { config, lookup: createDollLookup(DOLL_KINDS, config), layout: LAYOUT, rng: Math.random } };
}

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
function pullHeldDoll(state: ClawState, sway: Sway, dolls: Map<string, DollHandle>, deps: ClawDeps): void {
  const holdY = getHoldHeight(state, deps);
  if (state.held === null || holdY === null) return;

  dolls.get(state.held.dollId)?.setVelocityToward({ x: sway.shownX, y: holdY, z: sway.shownZ }, deps.config.grab.holdFollow);
}

/**
 * 인형 하나가 배출구 바닥 가까이 들어갔을 때 뽑은 것으로 칠지, 다시 떨어뜨릴지(judgeChuteArrival).
 * 들려 있거나 처음 떨어지는 중인 인형은 손대지 않는다. 처음 떨어지는 인형은 인형 스스로 다시 떨어진다(Doll.tsx).
 */
function judgeSnapshot(snapshot: DollSnapshot, state: ClawState, handle: DollHandle, hasDropped: boolean, deps: ClawDeps): ChuteVerdict {
  return judgeChuteArrival({
    isInChute: isInsideChute(snapshot, deps.lookup.metricsOf(snapshot.kindId), deps.layout, deps.config),
    isHeld: snapshot.id === state.held?.dollId,
    isFirstFalling: handle.isFirstFalling(),
    hasDropped,
  });
}

/**
 * 손가락을 인형을 쥔 모양으로 그릴지. 놓는 동안(release)에는 놓기 시작할 때의 모양을 그대로 지킨다.
 * 놓는 순간 쥔 인형이 없어졌다고 바로 다 오므린 모양으로 바꾸면, 손가락이 잠깐 더 꽉 쥐었다가 벌어져 보인다.
 */
function getHoldingPose(previous: boolean, state: ClawState): boolean {
  if (state.phase === 'release') return previous;
  return state.held !== null || state.pendingGrab !== null;
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

function blendView({ previous, current }: PoseHistory, ratio: number, state: ClawState, isHolding: boolean): ClawView {
  const blend = (key: keyof ClawPose): number => previous[key] + (current[key] - previous[key]) * ratio;
  return {
    x: blend('x'),
    z: blend('z'),
    shownX: blend('shownX'),
    shownZ: blend('shownZ'),
    hubY: blend('hubY'),
    closeAmount: blend('closeAmount'),
    isHolding,
    phase: state.phase,
  };
}
