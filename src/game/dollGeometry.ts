import type { GameConfig } from '../config/gameConfig';
import type { CabinetLayout, DollKind, DollMetrics, GrabTuning, Vec3 } from './types';

/** scale을 적용한 몸통 반지름 */
function getScaledCoreRadius(kind: DollKind): number {
  return kind.coreRadius * kind.scale;
}

/** 공통 난이도에 이 종류의 덮어쓰기를 얹은 값 */
export function getGrabTuning(kind: DollKind, config: GameConfig): GrabTuning {
  return {
    grip: kind.tuning?.grip ?? config.grab.grip,
    reachMargin: kind.tuning?.reachMargin ?? config.grab.reachMargin,
  };
}

/** 집게가 멈추는 높이·매다는 위치·막히는 범위·닿는 범위를 종류별 몸통 크기에서 계산한다 */
export function getDollMetrics(kind: DollKind, config: GameConfig): DollMetrics {
  const coreRadius = getScaledCoreRadius(kind);
  const holdOffset = coreRadius + config.claw.holdGap;

  return {
    coreRadius,
    holdOffset,
    stopOffset: holdOffset + config.claw.stopGap,
    blockRadius: coreRadius + config.claw.blockMargin,
    reachRadius: coreRadius + getGrabTuning(kind, config).reachMargin,
  };
}

/** 배출구는 가장 큰 인형이 들어가도록 크기를 정해 앞쪽 왼편 구석에 둔다. 집게 집 자리는 배출구 한가운데다. */
export function getCabinetLayout(kinds: readonly DollKind[], config: GameConfig): CabinetLayout {
  const { floorHalf, chuteMinSize, chuteMargin } = config.cabinet;
  const largestCoreRadius = kinds.reduce((largest, kind) => Math.max(largest, getScaledCoreRadius(kind)), 0);
  const chuteSize = Math.max(chuteMinSize, largestCoreRadius * 2 + chuteMargin);

  const chuteMinX = -floorHalf;
  const chuteMaxX = -floorHalf + chuteSize;
  const chuteMinZ = floorHalf - chuteSize;
  const chuteMaxZ = floorHalf;

  return {
    chuteSize,
    chuteMinX,
    chuteMaxX,
    chuteMinZ,
    chuteMaxZ,
    home: { x: (chuteMinX + chuteMaxX) / 2, z: (chuteMinZ + chuteMaxZ) / 2 },
  };
}

/** 배출구 범위 안에서 바닥 가까이 내려앉은 인형만 들어간 것으로 본다 */
export function isInsideChute(position: Vec3, metrics: DollMetrics, layout: CabinetLayout, config: GameConfig): boolean {
  const isWithinX = position.x >= layout.chuteMinX && position.x <= layout.chuteMaxX;
  const isWithinZ = position.z >= layout.chuteMinZ && position.z <= layout.chuteMaxZ;
  const isNearFloor = position.y < metrics.coreRadius + config.dolls.chuteDetectMargin;

  return isWithinX && isWithinZ && isNearFloor;
}
