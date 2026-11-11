import { expect, it } from 'vitest';
import { getCabinetLayout, getDollMetrics, getGrabTuning, getModelBaseY, isInsideChute } from './dollGeometry';
import { TEST_DOLL_KINDS, TEST_GAME_CONFIG } from './testFixtures';
import type { DollKind, GrabTuning } from './types';

const kind = (scale: number, tuning?: Partial<GrabTuning>): DollKind => ({ ...TEST_DOLL_KINDS[0], scale, tuning });
/** 머리를 원점의 공(반지름 0.5)으로 두고 모델 바닥을 그보다 1.0 아래에 둔 종류 */
const headCoreKind = (scale: number): DollKind => ({ ...TEST_DOLL_KINDS[0], scale, modelBaseY: -1.0 });

it('시제품과 같은 크기면 시제품 치수가 나온다', () => {
  expect(getDollMetrics(kind(1), TEST_GAME_CONFIG)).toEqual({
    coreRadius: 0.5,
    holdOffset: 0.75,
    stopOffset: 0.8,
    blockRadius: 0.75,
    reachRadius: 0.85,
    restHeight: 0.5,
  });
});
it('모델 바닥 높이를 적지 않으면 모델은 몸통 공 아래 끝에 선다', () => {
  expect(getModelBaseY(kind(1))).toBe(-0.5);
  expect(getModelBaseY(headCoreKind(1))).toBe(-1.0);
});
it('모델 바닥을 몸통 공보다 아래에 두면 똑바로 선 높이가 그만큼 높아지고 집게 치수는 그대로다', () => {
  const m = getDollMetrics(headCoreKind(1.2), TEST_GAME_CONFIG);
  expect(m.restHeight).toBeCloseTo(1.2);
  expect(m.coreRadius).toBeCloseTo(0.6);
  expect(m.holdOffset).toBeCloseTo(0.85);
});
it('모델 바닥이 몸통 공 아래 끝보다 위면 몸통 공으로 선다', () => {
  expect(getDollMetrics({ ...kind(1), modelBaseY: -0.2 }, TEST_GAME_CONFIG).restHeight).toBeCloseTo(0.5);
});
it('큰 인형은 치수가 함께 커진다', () => {
  const m = getDollMetrics(kind(1.4), TEST_GAME_CONFIG);
  expect(m.coreRadius).toBeCloseTo(0.7);
  expect(m.holdOffset).toBeCloseTo(0.95);
});
it('종류별 덮어쓰기가 공통 수치보다 우선한다', () => {
  expect(getGrabTuning(kind(1, { grip: 0.9 }), TEST_GAME_CONFIG)).toEqual({ grip: 0.9, reachMargin: 0.35 });
});
it('배출구는 가장 큰 인형에 맞춰지고 집게 이동 범위 안에 있다', () => {
  const layout = getCabinetLayout(TEST_DOLL_KINDS, TEST_GAME_CONFIG);
  expect(layout.chuteSize).toBeCloseTo(2.2);
  expect(layout.home).toEqual({ x: expect.closeTo(-1.9), z: expect.closeTo(1.9) });
  expect(Math.abs(layout.home.x)).toBeLessThanOrEqual(TEST_GAME_CONFIG.claw.moveLimit);
});
it('배출구 안 바닥에 놓인 인형만 들어간 것으로 본다', () => {
  const layout = getCabinetLayout(TEST_DOLL_KINDS, TEST_GAME_CONFIG);
  const m = getDollMetrics(kind(1), TEST_GAME_CONFIG);
  expect(isInsideChute({ x: -1.9, y: 0.5, z: 1.9 }, m, layout, TEST_GAME_CONFIG)).toBe(true);
  expect(isInsideChute({ x: -1.9, y: 3, z: 1.9 }, m, layout, TEST_GAME_CONFIG)).toBe(false);
  expect(isInsideChute({ x: 0, y: 0.5, z: 0 }, m, layout, TEST_GAME_CONFIG)).toBe(false);
});
it('모델 바닥이 몸통 공보다 아래인 인형은 배출구 바닥에 똑바로 서 있어도 들어간 것으로 본다', () => {
  const layout = getCabinetLayout(TEST_DOLL_KINDS, TEST_GAME_CONFIG);
  const m = getDollMetrics(headCoreKind(1), TEST_GAME_CONFIG);
  expect(isInsideChute({ x: -1.9, y: 1.0, z: 1.9 }, m, layout, TEST_GAME_CONFIG)).toBe(true);
  expect(isInsideChute({ x: -1.9, y: 3, z: 1.9 }, m, layout, TEST_GAME_CONFIG)).toBe(false);
});
