import { expect, it } from 'vitest';
import { createDollLookup } from '../game/grabJudge';
import { DOLL_KINDS } from './dollCatalog';
import { GAME_CONFIG } from './gameConfig';
import { applyTuning, isDebugMode } from './runtimeTuning';

it('덮어쓴 값만 바뀌고 원본은 그대로다', () => {
  const next = applyTuning(GAME_CONFIG, { grip: 0.9 });
  expect(next.grab.grip).toBe(0.9);
  expect(next.grab.reachMargin).toBe(0.35);
  expect(GAME_CONFIG.grab.grip).toBe(0.6);
});

it('?debug 가 있을 때만 조정 모드다', () => {
  expect(isDebugMode('?debug')).toBe(true);
  expect(isDebugMode('?reset&debug=1')).toBe(true);
  expect(isDebugMode('')).toBe(false);
  expect(isDebugMode('?debugger')).toBe(false);
});

it('닿는 여유와 보정 횟수도 덮어쓰고, 닿는 여유는 다시 만든 인형 표의 닿는 범위에 들어간다', () => {
  const next = applyTuning(GAME_CONFIG, { reachMargin: 0.8, pityAfterFails: 5 });
  expect(next.grab.pityAfterFails).toBe(5);
  expect(next.grab.grip).toBe(0.6);

  const kind = DOLL_KINDS[0];
  const before = createDollLookup(DOLL_KINDS, GAME_CONFIG).metricsOf(kind.id).reachRadius;
  const after = createDollLookup(DOLL_KINDS, next).metricsOf(kind.id).reachRadius;
  expect(after - before).toBeCloseTo(0.8 - 0.35);
});
