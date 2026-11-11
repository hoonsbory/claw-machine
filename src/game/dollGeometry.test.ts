import { expect, it } from 'vitest';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import { getCabinetLayout, getDollMetrics, getGrabTuning, isInsideChute } from './dollGeometry';
import type { DollKind, GrabTuning } from './types';

const kind = (scale: number, tuning?: Partial<GrabTuning>): DollKind => ({ ...DOLL_KINDS[0], scale, tuning });

it('시제품과 같은 크기면 시제품 치수가 나온다', () => {
  expect(getDollMetrics(kind(1), GAME_CONFIG)).toEqual({ coreRadius: 0.5, holdOffset: 0.75, stopOffset: 0.8, blockRadius: 0.75, reachRadius: 0.85 });
});
it('큰 인형은 치수가 함께 커진다', () => {
  const m = getDollMetrics(kind(1.4), GAME_CONFIG);
  expect(m.coreRadius).toBeCloseTo(0.7);
  expect(m.holdOffset).toBeCloseTo(0.95);
});
it('종류별 덮어쓰기가 공통 수치보다 우선한다', () => {
  expect(getGrabTuning(kind(1, { grip: 0.9 }), GAME_CONFIG)).toEqual({ grip: 0.9, reachMargin: 0.35 });
});
it('배출구는 가장 큰 인형에 맞춰지고 집게 이동 범위 안에 있다', () => {
  const layout = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
  expect(layout.chuteSize).toBeCloseTo(2.2);
  expect(layout.home).toEqual({ x: expect.closeTo(-1.9), z: expect.closeTo(1.9) });
  expect(Math.abs(layout.home.x)).toBeLessThanOrEqual(GAME_CONFIG.claw.moveLimit);
});
it('카탈로그는 5종이고 id가 겹치지 않으며 가장 큰 것이 가장 작은 것의 두 배다', () => {
  expect(new Set(DOLL_KINDS.map((k) => k.id)).size).toBe(5);
  const scales = DOLL_KINDS.map((k) => k.scale);
  expect(Math.max(...scales) / Math.min(...scales)).toBeCloseTo(2);
});
it('배출구 안 바닥에 놓인 인형만 들어간 것으로 본다', () => {
  const layout = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
  const m = getDollMetrics(kind(1), GAME_CONFIG);
  expect(isInsideChute({ x: -1.9, y: 0.5, z: 1.9 }, m, layout, GAME_CONFIG)).toBe(true);
  expect(isInsideChute({ x: -1.9, y: 3, z: 1.9 }, m, layout, GAME_CONFIG)).toBe(false);
  expect(isInsideChute({ x: 0, y: 0.5, z: 0 }, m, layout, GAME_CONFIG)).toBe(false);
});
