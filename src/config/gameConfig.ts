/** 조정 가능한 게임 수치 묶음. 수치는 이 파일에만 두고 다른 곳에 숫자로 다시 쓰지 않는다. */
export interface GameConfig {
  /** 기계 바닥·벽·배출구 크기 */
  readonly cabinet: {
    readonly floorHalf: number;
    readonly wallHeight: number;
    readonly chuteWallHeight: number;
    readonly chuteMinSize: number;
    readonly chuteMargin: number;
  };
  /** 집게 이동·내리기·올리기·흔들림 */
  readonly claw: {
    readonly moveLimit: number;
    readonly moveSpeed: number;
    readonly hubRestY: number;
    readonly hubMinY: number;
    readonly dropSpeed: number;
    readonly liftSpeed: number;
    readonly closeTime: number;
    readonly openTime: number;
    readonly releaseTime: number;
    readonly swayStiffness: number;
    readonly swayDamping: number;
    readonly holdGap: number;
    readonly stopGap: number;
    readonly blockMargin: number;
  };
  /** 집기 판정과 실패 뒤 보정 */
  readonly grab: {
    readonly grip: number;
    readonly reachMargin: number;
    readonly holdChanceScale: number;
    readonly holdChanceBase: number;
    readonly slipMinTime: number;
    readonly slipMaxTime: number;
    readonly sagTime: number;
    readonly sagDepth: number;
    readonly pityAfterFails: number;
    readonly pityMinQuality: number;
    readonly holdFollow: number;
    /** 들린 인형의 회전 속도에 매 프레임 곱해 팽이처럼 돌지 않게 한다 */
    readonly holdSpinDamping: number;
  };
  /** 인형 수와 사라짐·다시 떨어뜨리기 */
  readonly dolls: {
    readonly perKind: number;
    readonly vanishTime: number;
    readonly chuteDetectMargin: number;
    readonly respawnBelowY: number;
    /** 바닥 가장자리에서 이만큼 더 나가면 기계 밖으로 본다 */
    readonly outOfBoundsMargin: number;
  };
  /** 처음 인형을 놓는 자리: 가로·세로 범위, 배출구를 피하는 여유, 높이 */
  readonly spawn: {
    readonly limit: number;
    readonly chuteMargin: number;
    readonly baseHeight: number;
    readonly heightStep: number;
    /** 놓이거나 다시 떨어진 뒤 이 시간(초)이 지나면 멈추지 않았어도 처음 떨어지기가 끝난 것으로 본다 */
    readonly firstFallMaxTime: number;
  };
  /** 물리 엔진 */
  readonly physics: {
    readonly gravityY: number;
    readonly maxFrameTime: number;
    /** 인형 충돌체의 마찰·튕김과 강체의 감속 */
    readonly doll: {
      readonly friction: number;
      readonly restitution: number;
      readonly linearDamping: number;
      readonly angularDamping: number;
    };
    /** 기계 바닥·벽 충돌체의 마찰·튕김 */
    readonly wall: {
      readonly friction: number;
      readonly restitution: number;
    };
  };
}

export const GAME_CONFIG = {
  cabinet: { floorHalf: 3, wallHeight: 7, chuteWallHeight: 1.0, chuteMinSize: 1.8, chuteMargin: 0.8 },
  claw: {
    moveLimit: 2.5, moveSpeed: 3.2, hubRestY: 5.0, hubMinY: 0.95,
    dropSpeed: 3.2, liftSpeed: 2.2, closeTime: 0.45, openTime: 0.3, releaseTime: 1.1,
    swayStiffness: 120, swayDamping: 12, holdGap: 0.25, stopGap: 0.05, blockMargin: 0.25,
  },
  grab: {
    grip: 0.6, reachMargin: 0.35, holdChanceScale: 1.3, holdChanceBase: 0.3,
    slipMinTime: 0.5, slipMaxTime: 2.4, sagTime: 0.4, sagDepth: 0.35,
    pityAfterFails: 3, pityMinQuality: 0.25, holdFollow: 15, holdSpinDamping: 0.85,
  },
  dolls: { perKind: 3, vanishTime: 0.3, chuteDetectMargin: 0.4, respawnBelowY: -5, outOfBoundsMargin: 1 },
  spawn: { limit: 2.3, chuteMargin: 0.4, baseHeight: 1.5, heightStep: 0.9, firstFallMaxTime: 6 },
  physics: {
    gravityY: -20, maxFrameTime: 0.05,
    doll: { friction: 0.5, restitution: 0.15, linearDamping: 0.05, angularDamping: 0.35 },
    wall: { friction: 0.7, restitution: 0.05 },
  },
} as const satisfies GameConfig;
