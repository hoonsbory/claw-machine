import { expect, it } from 'vitest';
import { createDollLookup, decideGrab, findStopHeight } from './grabJudge';
import { TEST_DOLL_KINDS, TEST_GAME_CONFIG } from './testFixtures';
import { seq } from './testHelpers';
import type { DollSnapshot } from './types';

const doll = (id: string, kindId: string, x: number, y: number, z: number): DollSnapshot => ({ id, kindId, x, y, z });

const lookup = createDollLookup(TEST_DOLL_KINDS, TEST_GAME_CONFIG);
const base = { claw: { x: 0, z: 0 }, hubY: 1.3, dolls: [], failStreak: 0, lookup, config: TEST_GAME_CONFIG, rng: seq(0) };

it('아래에 인형이 없으면 바닥 근처에서 멈춘다', () => {
  expect(findStopHeight({ x: 0, z: 0 }, [], lookup, TEST_GAME_CONFIG)).toBe(0.95);
});
it('인형 위에서는 그 인형 크기에 맞는 높이에서 멈춘다', () => {
  expect(findStopHeight({ x: 0, z: 0 }, [doll('a', 'bear', 0.2, 0.5, 0)], lookup, TEST_GAME_CONFIG)).toBeCloseTo(1.3);
  expect(findStopHeight({ x: 0, z: 0 }, [doll('b', 'frog', 0.2, 0.7, 0)], lookup, TEST_GAME_CONFIG)).toBeCloseTo(1.7);
});
it('닿는 범위에 인형이 없으면 잡지 못한다', () => {
  expect(decideGrab({ ...base, dolls: [doll('a', 'bear', 2, 0.5, 0)] })).toBeNull();
});
it('여럿이 닿으면 가장 가까운 것을 잡는다', () => {
  const held = decideGrab({ ...base, dolls: [doll('far', 'bear', 0.6, 0.5, 0), doll('near', 'bear', 0.1, 0.5, 0)], rng: seq(0) });
  expect(held?.dollId).toBe('near');
});
it('정중앙을 잡으면 운이 0.77이어도 끝까지 든다', () => {
  // grip 0.6 * 1.3 * 1.0 = 0.78
  expect(decideGrab({ ...base, dolls: [doll('a', 'bear', 0, 0.5, 0)], rng: seq(0.77) })?.slipAt).toBe(Infinity);
});
it('빗겨 잡고 운이 나쁘면 정해진 시간 범위 안에서 놓친다', () => {
  const held = decideGrab({ ...base, dolls: [doll('a', 'bear', 0.6, 0.5, 0)], rng: seq(0.99, 0.5) });
  expect(held?.slipAt).toBeCloseTo(1.45); // 0.5 + 0.5 * (2.4 - 0.5)
});
it('3번 연속 실패 뒤에는 어느 정도만 잡아도 끝까지 든다', () => {
  // d 0.6, reach 0.85 → quality 약 0.29 ≥ 0.25
  expect(decideGrab({ ...base, failStreak: 3, dolls: [doll('a', 'bear', 0.6, 0.5, 0)], rng: seq(0.99, 0.5) })?.slipAt).toBe(Infinity);
});
it('보정이 걸려도 너무 빗겨 잡으면 보장하지 않는다', () => {
  // d 0.8 → quality 약 0.06 < 0.25
  expect(decideGrab({ ...base, failStreak: 3, dolls: [doll('a', 'bear', 0.8, 0.5, 0)], rng: seq(0.99, 0.5) })?.slipAt).not.toBe(Infinity);
});
it('종류별 집게 힘 덮어쓰기를 따른다', () => {
  const strong = createDollLookup([{ ...TEST_DOLL_KINDS[0], tuning: { grip: 1 } }], TEST_GAME_CONFIG);
  expect(decideGrab({ ...base, lookup: strong, dolls: [doll('a', 'bear', 0.4, 0.5, 0)], rng: seq(0.8) })?.slipAt).toBe(Infinity);
});
it('집게보다 높이 쌓인 인형은 잡지 않는다', () => {
  expect(decideGrab({ ...base, hubY: 0.95, dolls: [doll('a', 'bear', 0, 3, 0)] })).toBeNull();
});
it('잡을 인형이 없으면 운을 쓰지 않는다', () => {
  expect(decideGrab({ ...base, dolls: [doll('a', 'bear', 2, 0.5, 0)], rng: seq() })).toBeNull();
});
it('보정으로 끝까지 들기로 정해지면 운을 쓰지 않고 막 잡은 상태로 돌려준다', () => {
  const held = decideGrab({ ...base, failStreak: 3, dolls: [doll('a', 'bear', 0.6, 0.5, 0)], rng: seq() });
  expect(held).toEqual({ dollId: 'a', kindId: 'bear', slipAt: Infinity, heldTime: 0 });
});
it('카탈로그에 없는 종류를 찾으면 바로 알린다', () => {
  expect(() => lookup.metricsOf('dragon')).toThrow('dragon');
});
