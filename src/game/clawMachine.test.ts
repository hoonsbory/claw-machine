import { expect, it } from 'vitest';
import { createClawState, forgetDolls, getHoldHeight, markWin, stepClaw, type ClawDeps, type ClawInput } from './clawMachine';
import { getCabinetLayout } from './dollGeometry';
import { createDollLookup } from './grabJudge';
import { TEST_DOLL_KINDS, TEST_GAME_CONFIG } from './testFixtures';
import { seq } from './testHelpers';
import type { ClawEvent, ClawPhase, ClawState, DollSnapshot } from './types';

/** 집게 상태와 그때 바닥에 있는 인형 묶음 */
interface Fixture {
  state: ClawState;
  dolls: readonly DollSnapshot[];
}

interface RunResult {
  state: ClawState;
  events: ClawEvent[];
}

type RunInput = Partial<Pick<ClawInput, 'move' | 'dropRequested'>>;
type StopWhen = (result: RunResult) => boolean;

const FRAME_TIME = 1 / 60;
/** runUntil 이 기다리는 최대 시간. 시도 한 번은 이보다 훨씬 짧다. */
const UNTIL_LIMIT_SECONDS = 30;

const lookup = createDollLookup(TEST_DOLL_KINDS, TEST_GAME_CONFIG);
const layout = getCabinetLayout(TEST_DOLL_KINDS, TEST_GAME_CONFIG);
/** 난수를 부르면 실패한다. 난수가 필요한 실행은 run 에 따로 넘긴다. */
const deps: ClawDeps = { config: TEST_GAME_CONFIG, lookup, layout, rng: seq() };
const idleInput: ClawInput = { move: { x: 0, z: 0 }, dropRequested: false, dolls: [], dt: FRAME_TIME };

const initial = createClawState(layout, TEST_GAME_CONFIG);
const dollA: DollSnapshot = { id: 'a', kindId: 'bear', x: 0, y: 0.5, z: 0 };
const start: Fixture = { state: initial, dolls: [] };
const overDoll: Fixture = { state: { ...initial, x: dollA.x, z: dollA.z }, dolls: [dollA] };
/** 인형 a 에서 약 3.5 떨어진 곳 */
const overNothing: Fixture = { state: { ...initial, x: 2.5, z: -2.5 }, dolls: [dollA] };

/** dt 1/60 으로 stopWhen 이 참이 되거나 seconds 가 지날 때까지 돌린다. 내리기 요청은 첫 프레임에만 넣는다. */
const play = (fixture: Fixture, input: RunInput, seconds: number, rng: () => number, stopWhen: StopWhen): RunResult => {
  const frameDeps: ClawDeps = { ...deps, rng };
  const frameCount = Math.round(seconds / FRAME_TIME);
  const result: RunResult = { state: fixture.state, events: [] };

  for (let frame = 0; frame < frameCount && !stopWhen(result); frame += 1) {
    const isFirstFrame = frame === 0;
    const frameInput: ClawInput = { ...idleInput, ...input, dolls: fixture.dolls, dropRequested: isFirstFrame && input.dropRequested === true };
    const step = stepClaw(result.state, frameInput, frameDeps);
    result.state = step.state;
    result.events.push(...step.events);
  }

  return result;
};

const run = (fixture: Fixture, input: RunInput, seconds: number, rng: () => number = seq(0)): RunResult =>
  play(fixture, input, seconds, rng, (): boolean => false);

/** stopWhen 이 참이 되는 프레임까지 돌린다. 끝내 참이 되지 않으면 실패한다. */
const runUntil = (fixture: Fixture, input: RunInput, stopWhen: StopWhen, rng: () => number = seq(0)): RunResult => {
  const result = play(fixture, input, UNTIL_LIMIT_SECONDS, rng, stopWhen);
  if (!stopWhen(result)) throw new Error(`${UNTIL_LIMIT_SECONDS}초 안에 기다리던 순간이 오지 않았다`);
  return result;
};

const hasEvent = (type: ClawEvent['type']): StopWhen => ({ events }): boolean => events.some((event) => event.type === type);
const isInPhase = (phase: ClawPhase): StopWhen => ({ state }): boolean => state.phase === phase;

it('대기 중에는 입력대로 움직이고 이동 한계를 넘지 않는다', () => {
  const { state } = run(start, { move: { x: 1, z: -1 } }, 5);
  expect(state.x).toBe(2.5);
  expect(state.z).toBe(-2.5);
});
it('인형을 잡아 배출구 위까지 옮긴 뒤 놓고 대기로 돌아온다', () => {
  const { state, events } = run(overDoll, { dropRequested: true }, 12);
  expect(events.map((e) => e.type)).toEqual(['dropStarted', 'grabbed', 'released', 'tryEnded']);
  expect(events[2]).toEqual({ type: 'released', dollId: 'a' });
  expect(state.phase).toBe('idle');
  expect({ x: state.x, z: state.z }).toEqual(layout.home);
});
it('허공을 집으면 missed 이고 실패가 하나 쌓인다', () => {
  const { state, events } = run(overNothing, { dropRequested: true }, 12);
  expect(events.map((e) => e.type)).toEqual(['dropStarted', 'missed', 'released', 'tryEnded']);
  expect(state.failStreak).toBe(1);
});
it('놓치기로 정해진 인형은 도중에 떨어지고 집게는 끝까지 돌아간다', () => {
  const { state, events } = run(overDoll, { dropRequested: true }, 12, seq(0.99, 0));
  expect(events.map((e) => e.type)).toEqual(['dropStarted', 'grabbed', 'slipped', 'released', 'tryEnded']);
  expect(events[3]).toEqual({ type: 'released', dollId: null });
  expect(state.failStreak).toBe(1);
});
it('놓치기 직전에는 인형이 처진다', () => {
  // slipAt 0.5, sagTime 0.4 → 잡은 뒤 0.1초부터 처진다. 옮기는 중이라 집게 높이는 그대로다.
  const heightAt = (heldTime: number): number => {
    const carrying: ClawState = { ...overDoll.state, phase: 'carry', held: { dollId: 'a', kindId: 'bear', slipAt: 0.5, heldTime } };
    const height = getHoldHeight(carrying, deps);
    if (height === null) throw new Error('들고 있는데 매달린 높이가 없다');
    return height;
  };
  const steady = heightAt(0);
  const early = heightAt(0.3);
  const late = heightAt(0.49);
  expect(steady).toBeCloseTo(4.25); // hubRestY 5 - 곰 holdOffset 0.75
  expect(early).toBeLessThan(steady);
  expect(late).toBeLessThan(early);
});
it('인형이 쉬는 높이보다 높이 쌓여 있으면 그 자리에서 멈추고 위로 올라가지 않는다', () => {
  // 곰 멈춤 오프셋 0.8 → 4.5 + 0.8 = 5.3 > hubRestY 5
  const stacked: Fixture = { ...overDoll, dolls: [{ ...dollA, y: 4.5 }] };
  const heights: number[] = [];
  const recordUntilClose: StopWhen = ({ state }): boolean => {
    heights.push(state.hubY);
    return state.phase === 'close';
  };
  const closing = runUntil(stacked, { dropRequested: true }, recordUntilClose).state;
  expect(Math.max(...heights)).toBeLessThanOrEqual(stacked.state.hubY);
  expect(closing.hubY).toBe(stacked.state.hubY);
  // 잡기 판정은 평소대로 그 순간에 한다
  expect(closing.pendingGrab?.dollId).toBe('a');
});
it('시도 중에는 내리기와 이동 입력을 무시한다', () => {
  const dropping = stepClaw(start.state, { ...idleInput, dropRequested: true }, deps).state;
  const next = stepClaw(dropping, { ...idleInput, dropRequested: true, move: { x: 1, z: 0 } }, deps);
  expect(next.events).toEqual([]);
  expect(next.state.x).toBe(dropping.x);
});
it('markWin 뒤에 끝난 시도는 실패로 세지 않는다', () => {
  const streaked: Fixture = { ...overDoll, state: { ...overDoll.state, failStreak: 2 } };
  const released = runUntil(streaked, { dropRequested: true }, hasEvent('released')).state;

  const unmarked = run({ ...overDoll, state: released }, {}, 3, seq());
  expect(unmarked.events).toEqual([{ type: 'tryEnded', won: false }]);
  expect(unmarked.state.failStreak).toBe(3);

  const marked = run({ ...overDoll, state: markWin(released) }, {}, 3, seq());
  expect(marked.events).toEqual([{ type: 'tryEnded', won: true }]);
  expect(marked.state.failStreak).toBe(0);
});
it('들고 있던 인형이 사라지면 빈손으로 동작을 마친다 (Review Focus 3)', () => {
  const lifting = runUntil(overDoll, { dropRequested: true }, hasEvent('grabbed')).state;
  expect(lifting.phase).toBe('lift');
  expect(lifting.held?.dollId).toBe('a');

  // 같은 종류를 뽑아 들고 있던 인형이 사라지면 호출하는 쪽은 markWin 과 forgetDolls 를 함께 부른다
  const emptied = forgetDolls(markWin(lifting), ['a']);
  expect(emptied.held).toBeNull();
  expect(getHoldHeight(emptied, deps)).toBeNull();

  const { state, events } = run({ state: emptied, dolls: [] }, {}, 12, seq());
  expect(events).toEqual([{ type: 'released', dollId: null }, { type: 'tryEnded', won: true }]);
  expect(state.phase).toBe('idle');
  expect(state.failStreak).toBe(0);
});
it('오므리는 동안 잡기로 한 인형이 사라지면 빈손으로 올라간다', () => {
  const closing = runUntil(overDoll, { dropRequested: true }, isInPhase('close')).state;
  expect(closing.pendingGrab?.dollId).toBe('a');
  expect(forgetDolls(closing, ['b']).pendingGrab).toEqual(closing.pendingGrab);

  const emptied = forgetDolls(closing, ['a']);
  expect(emptied.pendingGrab).toBeNull();

  const { events } = run({ state: emptied, dolls: [] }, {}, 12, seq());
  expect(events.map((e) => e.type)).toEqual(['missed', 'released', 'tryEnded']);
});
it('한 프레임이 매우 길어도 바닥과 이동 한계를 넘지 않는다 (Review Focus 4)', () => {
  const dropping = stepClaw(start.state, { ...idleInput, dropRequested: true }, deps).state;
  const next = stepClaw(dropping, { ...idleInput, dt: 30 }, deps).state;
  expect(next.hubY).toBeGreaterThanOrEqual(TEST_GAME_CONFIG.claw.hubMinY);
  // 긴 프레임도 maxFrameTime 만큼만 진행한다
  expect(next.hubY).toBeCloseTo(TEST_GAME_CONFIG.claw.hubRestY - TEST_GAME_CONFIG.claw.dropSpeed * TEST_GAME_CONFIG.physics.maxFrameTime);
  const moved = stepClaw(start.state, { ...idleInput, move: { x: 1, z: 1 }, dt: 30 }, deps).state;
  expect(moved.x).toBeLessThanOrEqual(TEST_GAME_CONFIG.claw.moveLimit);
});
it('입력 상태를 바꾸지 않는다', () => {
  const frozen = Object.freeze({ ...start.state });
  expect(() => stepClaw(frozen, { ...idleInput, move: { x: 1, z: 0 } }, deps)).not.toThrow();
  // 들고 있는 인형 기록도 고치지 않고 새로 만든다
  const held = Object.freeze({ dollId: 'a', kindId: 'bear', slipAt: Infinity, heldTime: 0 });
  const lifting: ClawState = { ...overDoll.state, phase: 'lift', hubY: 2, held };
  expect(() => stepClaw(Object.freeze(lifting), idleInput, deps)).not.toThrow();
});
