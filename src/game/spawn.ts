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

/** 다시 떨어뜨리는 인형의 자리. 처음 넣을 수 있는 인형 전부(kindCount × dolls.perKind)보다 한 칸 위에서 떨어져, 쌓인 인형 속에 끼지 않는다. */
export function pickRespawnPoint(kindCount: number, layout: CabinetLayout, config: GameConfig, rng: () => number): Vec3 {
  return pickSpawnPoint(kindCount * config.dolls.perKind, layout, config, rng);
}

/** 바닥 아래로 떨어졌거나 바닥 가장자리 밖으로 나간 위치인지 */
export function isOutOfBounds(position: Vec3, config: GameConfig): boolean {
  const edge = config.cabinet.floorHalf + config.dolls.outOfBoundsMargin;
  const isBelowFloor = position.y < config.dolls.respawnBelowY;
  const isOutsideEdge = Math.abs(position.x) > edge || Math.abs(position.z) > edge;

  return isBelowFloor || isOutsideEdge;
}

/** 인형이 놓이거나 다시 떨어진 뒤의 상태 */
export interface FallState {
  /** 놓이거나 다시 떨어진 뒤 지난 시간(초) */
  sinceSpawn: number;
  /** 그 뒤 한 번이라도 멈췄거나 집게에 들렸는지 */
  hasSettled: boolean;
}

/** 처음 떨어지는 중인지: 아직 멈추거나 집게에 들린 적이 없고 spawn.firstFallMaxTime 도 지나지 않은 동안이다 */
export function isFirstFall(fall: FallState, config: GameConfig): boolean {
  return !fall.hasSettled && fall.sinceSpawn < config.spawn.firstFallMaxTime;
}

/**
 * 인형을 위에서 다시 떨어뜨려야 하는지. 기계 밖으로 나갔거나, 처음 떨어지는 중에 높이와 상관없이 배출구 위로 넘어갔을 때다.
 * 높은 곳에서 떨어진 인형이 쌓인 인형에 튕겨 배출구 칸막이를 넘으면 시작하자마자 뽑힌 것이 되기 때문이다.
 * 처음 떨어지기가 끝난 뒤 굴러 들어간 인형은 뽑은 것으로 둔다.
 */
export function needsRedrop(position: Vec3, fall: FallState, layout: CabinetLayout, config: GameConfig): boolean {
  if (isOutOfBounds(position, config)) return true;
  if (!isFirstFall(fall, config)) return false;

  const isOverChuteX = position.x >= layout.chuteMinX && position.x <= layout.chuteMaxX;
  const isOverChuteZ = position.z >= layout.chuteMinZ && position.z <= layout.chuteMaxZ;
  return isOverChuteX && isOverChuteZ;
}

/** 들려 있지 않은 인형 하나를 배출구와 견줘 정한 일: 아무 일 없음, 뽑음, 위에서 다시 떨어뜨림 */
export type ChuteVerdict = 'none' | 'win' | 'redrop';

/** 배출구에 들어왔는지 판단하는 데 쓰는 인형 하나의 처지 */
export interface ChuteCheck {
  /** 배출구 안 바닥 가까이 내려앉았는지(isInsideChute) */
  isInChute: boolean;
  /** 집게에 들려 있는지 */
  isHeld: boolean;
  /** 처음 떨어지는 중인지. 이런 인형은 배출구 위로 넘어가는 순간 인형 스스로 다시 떨어진다(needsRedrop). */
  isFirstFalling: boolean;
  /** 이 페이지를 연 뒤 내리기를 한 번이라도 요청했는지 */
  hasDropped: boolean;
}

/**
 * 배출구 바닥에 들어온 인형을 뽑은 것으로 칠지 정한다. 첫 내리기 전에는 아무것도 누르지 않았는데 뽑히는 일이 없도록
 * 뽑은 것으로 치지 않고 다시 떨어뜨린다. 첫 내리기 뒤에는 집게가 놓았든 굴러 들어갔든 뽑은 것이다.
 */
export function judgeChuteArrival({ isInChute, isHeld, isFirstFalling, hasDropped }: ChuteCheck): ChuteVerdict {
  if (!isInChute || isHeld || isFirstFalling) return 'none';
  if (!hasDropped) return 'redrop';
  return 'win';
}
