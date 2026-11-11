import type { GameConfig } from '../config/gameConfig';
import { decideGrab, findStopHeight } from './grabJudge';
import { clamp } from './math';
import type { CabinetLayout, ClawEvent, ClawPhase, ClawState, DollLookup, DollSnapshot, HeldDoll, Vec2 } from './types';

/** 집게 상태 흐름이 쓰는 수치·인형 치수·기계 배치·난수 */
export interface ClawDeps {
  config: GameConfig;
  lookup: DollLookup;
  layout: CabinetLayout;
  /** 0 이상 1 미만 난수 */
  rng: () => number;
}

/** 한 프레임의 조작과 바닥 인형 위치 */
export interface ClawInput {
  /** 조이스틱 기울기. 각 축 -1~1 */
  move: Vec2;
  dropRequested: boolean;
  dolls: readonly DollSnapshot[];
  /** 지난 프레임부터 흐른 시간(초) */
  dt: number;
}

/** 한 프레임 진행한 결과: 새 상태와 그 프레임에 일어난 일 */
interface ClawStep {
  state: ClawState;
  events: ClawEvent[];
}

/** 집 자리(배출구 위) 가장 높은 곳에서 벌린 채 기다리는 처음 상태 */
export function createClawState(layout: CabinetLayout, config: GameConfig): ClawState {
  return {
    phase: 'idle',
    phaseTime: 0,
    x: layout.home.x,
    z: layout.home.z,
    hubY: config.claw.hubRestY,
    closeAmount: 0,
    pendingGrab: null,
    held: null,
    failStreak: 0,
    wonThisTry: false,
  };
}

function enterPhase(state: ClawState, phase: ClawPhase): ClawState {
  return { ...state, phase, phaseTime: 0 };
}

/** 앞 처리의 상태를 이어받아 다음 처리를 하고 두 처리의 일을 차례로 합친다 */
function andThen(first: ClawStep, next: (state: ClawState) => ClawStep): ClawStep {
  const second = next(first.state);
  return { state: second.state, events: [...first.events, ...second.events] };
}

/** 조이스틱대로 이동 한계 안에서 움직이고, 내리기 요청이 오면 새 시도를 시작한다 */
function stepIdle(state: ClawState, input: ClawInput, dt: number, config: GameConfig): ClawStep {
  const { moveLimit, moveSpeed } = config.claw;
  const distance = moveSpeed * dt;
  const moved: ClawState = {
    ...state,
    x: clamp(state.x + input.move.x * distance, -moveLimit, moveLimit),
    z: clamp(state.z + input.move.z * distance, -moveLimit, moveLimit),
  };
  if (!input.dropRequested) return { state: moved, events: [] };

  return { state: { ...enterPhase(moved, 'drop'), wonThisTry: false }, events: [{ type: 'dropStarted' }] };
}

/**
 * 아래 인형이나 바닥 근처에 닿으면 그 높이에 멈추고, 무엇을 잡고 언제 놓칠지 그 순간에 정한다.
 * 내리는 중에는 위로 올라가지 않는다: 멈출 높이가 이미 지금 높이 이상이면 그 자리에서 멈춘다.
 */
function stepDrop(state: ClawState, dolls: readonly DollSnapshot[], dt: number, deps: ClawDeps): ClawStep {
  const { config, lookup, rng } = deps;
  const claw: Vec2 = { x: state.x, z: state.z };
  const stopY = Math.min(findStopHeight(claw, dolls, lookup, config), state.hubY);
  const hubY = state.hubY - config.claw.dropSpeed * dt;
  if (hubY > stopY) return { state: { ...state, hubY }, events: [] };

  const pendingGrab = decideGrab({ claw, hubY: stopY, dolls, failStreak: state.failStreak, lookup, config, rng });
  return { state: { ...enterPhase(state, 'close'), hubY: stopY, pendingGrab }, events: [] };
}

/** 다 오므리면 정해 둔 결과를 쥐고 올라가기 시작한다 */
function stepClose(state: ClawState, config: GameConfig): ClawStep {
  const { closeTime } = config.claw;
  const closeAmount = Math.min(state.phaseTime / closeTime, 1);
  if (state.phaseTime < closeTime) return { state: { ...state, closeAmount }, events: [] };

  const held = state.pendingGrab;
  const event: ClawEvent = held === null ? { type: 'missed' } : { type: 'grabbed', dollId: held.dollId };
  return { state: { ...enterPhase(state, 'lift'), closeAmount, held, pendingGrab: null }, events: [event] };
}

/** 쥔 시간을 늘리고, 놓칠 시점이 되면 인형을 떨어뜨린다. 집게는 오므린 채 하던 동작을 계속한다. */
function tickHeld(state: ClawState, dt: number): ClawStep {
  const { held } = state;
  if (held === null) return { state, events: [] };

  const heldTime = held.heldTime + dt;
  const isSlipping = heldTime >= held.slipAt;
  if (isSlipping) return { state: { ...state, held: null }, events: [{ type: 'slipped', dollId: held.dollId }] };

  return { state: { ...state, held: { ...held, heldTime } }, events: [] };
}

/** 쉬는 높이까지 올라가면 집 자리로 옮기기 시작한다 */
function stepLift(state: ClawState, dt: number, config: GameConfig): ClawStep {
  const { liftSpeed, hubRestY } = config.claw;
  const hubY = state.hubY + liftSpeed * dt;
  if (hubY < hubRestY) return { state: { ...state, hubY }, events: [] };

  return { state: { ...enterPhase(state, 'carry'), hubY: hubRestY }, events: [] };
}

/** 집 자리로 곧게 옮기고, 도착하면 쥔 것을 놓는다 */
function stepCarry(state: ClawState, dt: number, deps: ClawDeps): ClawStep {
  const { home } = deps.layout;
  const toHomeX = home.x - state.x;
  const toHomeZ = home.z - state.z;
  const remaining = Math.hypot(toHomeX, toHomeZ);
  const travel = deps.config.claw.moveSpeed * dt;

  const isArriving = travel >= remaining;
  if (isArriving) {
    const dollId = state.held?.dollId ?? null;
    return { state: { ...enterPhase(state, 'release'), x: home.x, z: home.z, held: null }, events: [{ type: 'released', dollId }] };
  }

  const ratio = travel / remaining;
  return { state: { ...state, x: state.x + toHomeX * ratio, z: state.z + toHomeZ * ratio }, events: [] };
}

/** 벌린 뒤 인형이 떨어질 시간을 기다렸다가 시도를 끝낸다. 뽑았다는 표시가 없으면 실패를 하나 쌓는다. */
function stepRelease(state: ClawState, config: GameConfig): ClawStep {
  const { openTime, releaseTime } = config.claw;
  const closeAmount = Math.max(1 - state.phaseTime / openTime, 0);
  if (state.phaseTime < releaseTime) return { state: { ...state, closeAmount }, events: [] };

  const won = state.wonThisTry;
  const failStreak = won ? state.failStreak : state.failStreak + 1;
  return { state: { ...enterPhase(state, 'idle'), closeAmount, failStreak }, events: [{ type: 'tryEnded', won }] };
}

/** 한 프레임 진행한다. 입력 상태는 바꾸지 않고 새 상태와 이번 프레임에 일어난 일을 돌려준다. */
export function stepClaw(state: ClawState, input: ClawInput, deps: ClawDeps): { state: ClawState; events: ClawEvent[] } {
  const { config } = deps;
  const dt = Math.min(input.dt, config.physics.maxFrameTime);
  const current: ClawState = { ...state, phaseTime: state.phaseTime + dt };

  switch (current.phase) {
    case 'idle':
      return stepIdle(current, input, dt, config);
    case 'drop':
      return stepDrop(current, input.dolls, dt, deps);
    case 'close':
      return stepClose(current, config);
    case 'lift':
      return andThen(tickHeld(current, dt), (next): ClawStep => stepLift(next, dt, config));
    case 'carry':
      return andThen(tickHeld(current, dt), (next): ClawStep => stepCarry(next, dt, deps));
    case 'release':
      return stepRelease(current, config);
  }
}

/** 이번 시도에서 인형을 뽑았다고 표시한다. 연속 실패도 끊긴다. */
export function markWin(state: ClawState): ClawState {
  return { ...state, wonThisTry: true, failStreak: 0 };
}

/** 쥐고 있거나 쥐기로 한 인형이 사라졌으면 비운다. 집게는 빈손으로 남은 동작을 마친다. */
export function forgetDolls(state: ClawState, removedIds: readonly string[]): ClawState {
  const keepUnlessRemoved = (doll: HeldDoll | null): HeldDoll | null => {
    if (doll === null || removedIds.includes(doll.dollId)) return null;
    return doll;
  };
  return { ...state, held: keepUnlessRemoved(state.held), pendingGrab: keepUnlessRemoved(state.pendingGrab) };
}

/** 쥔 인형이 매달릴 높이. 놓칠 때가 가까워지면 sagTime 동안 sagDepth 만큼 처진다. 들고 있지 않으면 null. */
export function getHoldHeight(state: ClawState, deps: ClawDeps): number | null {
  const { held } = state;
  if (held === null) return null;

  const { sagTime, sagDepth } = deps.config.grab;
  const sagStartTime = held.slipAt - sagTime;
  const sag = clamp((held.heldTime - sagStartTime) / sagTime, 0, 1);
  return state.hubY - deps.lookup.metricsOf(held.kindId).holdOffset - sag * sagDepth;
}
