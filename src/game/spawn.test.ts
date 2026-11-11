import { expect, it } from 'vitest';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import { getCabinetLayout } from './dollGeometry';
import { isOutOfBounds, needsRedrop, pickSpawnPoint } from './spawn';

const layout = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);

it('처음 자리는 기계 안이고 배출구를 피한다', () => {
  for (let i = 0; i < 200; i += 1) {
    const p = pickSpawnPoint(i % 15, layout, GAME_CONFIG, Math.random);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(2.3);
    expect(Math.abs(p.z)).toBeLessThanOrEqual(2.3);
    expect(p.x < layout.chuteMaxX + 0.4 && p.z > layout.chuteMinZ - 0.4).toBe(false);
  }
});
it('나중 인형일수록 높은 곳에서 떨어진다', () => {
  expect(pickSpawnPoint(3, layout, GAME_CONFIG, () => 0.5).y).toBeCloseTo(4.2);
});
it('기계 밖이나 바닥 아래로 나간 인형을 알아챈다 (Review Focus 5)', () => {
  expect(isOutOfBounds({ x: 0, y: -6, z: 0 }, GAME_CONFIG)).toBe(true);
  expect(isOutOfBounds({ x: 4.5, y: 1, z: 0 }, GAME_CONFIG)).toBe(true);
  expect(isOutOfBounds({ x: 2.9, y: 0.5, z: -2.9 }, GAME_CONFIG)).toBe(false);
});
const overChute = { x: layout.home.x, y: 1.6, z: layout.home.z };
const falling = { sinceSpawn: 1, hasSettled: false };
const settled = { sinceSpawn: 1, hasSettled: true };

it('처음 떨어지다 배출구 위로 넘어간 인형만 다시 떨어뜨린다', () => {
  expect(needsRedrop(overChute, falling, layout, GAME_CONFIG)).toBe(true);
  expect(needsRedrop(overChute, settled, layout, GAME_CONFIG)).toBe(false);
  expect(needsRedrop({ x: 0, y: 0.5, z: 0 }, falling, layout, GAME_CONFIG)).toBe(false);
  expect(needsRedrop({ x: 0, y: -6, z: 0 }, settled, layout, GAME_CONFIG)).toBe(true);
});
it('멈추지 않은 인형도 처음 떨어진 지 정한 시간이 지나면 배출구에 들어가도 그대로 둔다', () => {
  const cap = GAME_CONFIG.spawn.firstFallMaxTime;
  expect(cap).toBe(6);
  expect(needsRedrop(overChute, { sinceSpawn: cap - 0.1, hasSettled: false }, layout, GAME_CONFIG)).toBe(true);
  expect(needsRedrop(overChute, { sinceSpawn: cap, hasSettled: false }, layout, GAME_CONFIG)).toBe(false);
});
