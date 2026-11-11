import type { GameConfig } from '../config/gameConfig';
import type { CabinetLayout, Vec3 } from './types';

/** rng 하나로 -limit ~ limit 사이 값을 고른다 */
function randomWithin(limit: number, rng: () => number): number {
  return (rng() * 2 - 1) * limit;
}

/**
 * index 번째 인형을 처음 놓을 자리. 배출구와 그 주변 여유를 피한 범위에서 x·z를 고르고,
 * 나중 인형일수록 높은 곳에 두어 차례로 떨어져 쌓이게 한다.
 * 배출구 근처가 나오면 다시 고른다(약 17% 확률이라 금방 끝난다).
 */
export function pickSpawnPoint(index: number, layout: CabinetLayout, config: GameConfig, rng: () => number): Vec3 {
  const { limit, chuteMargin, baseHeight, heightStep } = config.spawn;
  const y = baseHeight + index * heightStep;

  for (;;) {
    const x = randomWithin(limit, rng);
    const z = randomWithin(limit, rng);
    const isNearChute = x < layout.chuteMaxX + chuteMargin && z > layout.chuteMinZ - chuteMargin;
    if (!isNearChute) return { x, y, z };
  }
}

/** 바닥 아래로 떨어졌거나 바닥 가장자리 밖으로 나간 위치인지 */
export function isOutOfBounds(position: Vec3, config: GameConfig): boolean {
  const edge = config.cabinet.floorHalf + config.dolls.outOfBoundsMargin;
  const isBelowFloor = position.y < config.dolls.respawnBelowY;
  const isOutsideEdge = Math.abs(position.x) > edge || Math.abs(position.z) > edge;

  return isBelowFloor || isOutsideEdge;
}

/**
 * 인형을 위에서 다시 떨어뜨려야 하는지. 기계 밖으로 나갔거나, 처음 떨어지는 중(아직 한 번도 멈추거나
 * 집게에 들린 적이 없는 동안)에 높이와 상관없이 배출구 위로 넘어갔을 때다.
 * 높은 곳에서 떨어진 인형이 쌓인 인형에 튕겨 배출구 칸막이를 넘으면 시작하자마자 뽑힌 것이 되기 때문이다.
 */
export function needsRedrop(position: Vec3, isFirstFall: boolean, layout: CabinetLayout, config: GameConfig): boolean {
  if (isOutOfBounds(position, config)) return true;
  if (!isFirstFall) return false;

  const isOverChuteX = position.x >= layout.chuteMinX && position.x <= layout.chuteMaxX;
  const isOverChuteZ = position.z >= layout.chuteMinZ && position.z <= layout.chuteMaxZ;
  return isOverChuteX && isOverChuteZ;
}
