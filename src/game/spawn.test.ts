import { describe, expect, it } from 'vitest';
import { getCabinetLayout } from './dollGeometry';
import { isFirstFall, isOutOfBounds, judgeChuteArrival, needsRedrop, pickRespawnPoint, pickSpawnPoint, type ChuteCheck } from './spawn';
import { TEST_DOLL_KINDS, TEST_GAME_CONFIG } from './testFixtures';

const layout = getCabinetLayout(TEST_DOLL_KINDS, TEST_GAME_CONFIG);

it('처음 자리는 기계 안이고 배출구를 피한다', () => {
  for (let i = 0; i < 200; i += 1) {
    const p = pickSpawnPoint(i % 15, layout, TEST_GAME_CONFIG, Math.random);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(2.3);
    expect(Math.abs(p.z)).toBeLessThanOrEqual(2.3);
    expect(p.x < layout.chuteMaxX + 0.4 && p.z > layout.chuteMinZ - 0.4).toBe(false);
  }
});
it('나중 인형일수록 높은 곳에서 떨어진다', () => {
  expect(pickSpawnPoint(3, layout, TEST_GAME_CONFIG, () => 0.5).y).toBeCloseTo(4.2);
});
it('기계 밖이나 바닥 아래로 나간 인형을 알아챈다 (Review Focus 5)', () => {
  expect(isOutOfBounds({ x: 0, y: -6, z: 0 }, TEST_GAME_CONFIG)).toBe(true);
  expect(isOutOfBounds({ x: 4.5, y: 1, z: 0 }, TEST_GAME_CONFIG)).toBe(true);
  expect(isOutOfBounds({ x: 2.9, y: 0.5, z: -2.9 }, TEST_GAME_CONFIG)).toBe(false);
});
const overChute = { x: layout.home.x, y: 1.6, z: layout.home.z };
const falling = { sinceSpawn: 1, hasSettled: false };
const settled = { sinceSpawn: 1, hasSettled: true };

it('처음 떨어지다 배출구 위로 넘어간 인형만 다시 떨어뜨린다', () => {
  expect(needsRedrop(overChute, falling, layout, TEST_GAME_CONFIG)).toBe(true);
  expect(needsRedrop(overChute, settled, layout, TEST_GAME_CONFIG)).toBe(false);
  expect(needsRedrop({ x: 0, y: 0.5, z: 0 }, falling, layout, TEST_GAME_CONFIG)).toBe(false);
  expect(needsRedrop({ x: 0, y: -6, z: 0 }, settled, layout, TEST_GAME_CONFIG)).toBe(true);
});
it('멈추지 않은 인형도 처음 떨어진 지 정한 시간이 지나면 배출구에 들어가도 그대로 둔다', () => {
  const cap = TEST_GAME_CONFIG.spawn.firstFallMaxTime;
  expect(needsRedrop(overChute, { sinceSpawn: cap - 0.1, hasSettled: false }, layout, TEST_GAME_CONFIG)).toBe(true);
  expect(needsRedrop(overChute, { sinceSpawn: cap, hasSettled: false }, layout, TEST_GAME_CONFIG)).toBe(false);
});
it('멈추거나 들린 적이 없고 정한 시간이 지나지 않은 동안만 처음 떨어지는 중이다', () => {
  const cap = TEST_GAME_CONFIG.spawn.firstFallMaxTime;
  expect(isFirstFall({ sinceSpawn: 0, hasSettled: false }, TEST_GAME_CONFIG)).toBe(true);
  expect(isFirstFall({ sinceSpawn: cap - 0.1, hasSettled: false }, TEST_GAME_CONFIG)).toBe(true);
  expect(isFirstFall({ sinceSpawn: cap, hasSettled: false }, TEST_GAME_CONFIG)).toBe(false);
  expect(isFirstFall(settled, TEST_GAME_CONFIG)).toBe(false);
});

it('다시 떨어뜨리는 인형은 처음 넣을 수 있는 인형 전부보다 한 칸 위에서 배출구를 피해 떨어진다', () => {
  // 5종 × 3개 = 15 → 1.5 + 15 × 0.9
  const p = pickRespawnPoint(TEST_DOLL_KINDS.length, layout, TEST_GAME_CONFIG, () => 0.5);
  expect(p.y).toBeCloseTo(15);
  expect(p.x < layout.chuteMaxX + 0.4 && p.z > layout.chuteMinZ - 0.4).toBe(false);
});

describe('배출구에 들어온 인형', () => {
  const arrived: ChuteCheck = { isInChute: true, isHeld: false, isFirstFalling: false, hasDropped: true };

  it('첫 내리기 뒤에는 집게가 놓았든 굴러 들어갔든 뽑은 것이다', () => {
    expect(judgeChuteArrival(arrived)).toBe('win');
  });
  it('이 페이지에서 내리기를 한 번도 요청하지 않았으면 뽑은 것으로 치지 않고 다시 떨어뜨린다', () => {
    expect(judgeChuteArrival({ ...arrived, hasDropped: false })).toBe('redrop');
  });
  it('배출구 밖이거나, 집게에 들려 있거나, 처음 떨어지는 중이면 아무 일도 없다', () => {
    for (const hasDropped of [true, false]) {
      expect(judgeChuteArrival({ ...arrived, hasDropped, isInChute: false })).toBe('none');
      expect(judgeChuteArrival({ ...arrived, hasDropped, isHeld: true })).toBe('none');
      expect(judgeChuteArrival({ ...arrived, hasDropped, isFirstFalling: true })).toBe('none');
    }
  });
});
