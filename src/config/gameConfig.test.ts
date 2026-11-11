import { expect, it } from 'vitest';
import { GAME_CONFIG } from './gameConfig';

it('시제품에서 확인한 시작값을 그대로 가진다', () => {
  expect(GAME_CONFIG.grab.grip).toBe(0.6);
  expect(GAME_CONFIG.grab.pityAfterFails).toBe(3);
  expect(GAME_CONFIG.dolls.perKind).toBe(3);
});
