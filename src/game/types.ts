/** 바닥 평면 위 좌표(위아래 축 제외) */
export interface Vec2 {
  x: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 충돌 계산에 쓰는 단순 도형. 치수는 scale 적용 전 값이다. */
export type DollCollider =
  | { shape: 'ball'; radius: number; offset: readonly [number, number, number] }
  | { shape: 'capsule'; halfHeight: number; radius: number; offset: readonly [number, number, number] };

/** 모델 파일이 없을 때 코드로 그리는 임시 인형 생김새 */
export type PlaceholderLook = 'bear' | 'bunny' | 'cat' | 'chick' | 'frog';

/** 집기 난이도 수치. 공통값을 종류별로 덮어쓸 수 있다. */
export interface GrabTuning {
  grip: number;
  reachMargin: number;
}

/** 인형 한 종류의 설정 묶음 */
export interface DollKind {
  id: string;
  displayName: string;
  /** null이면 임시 도형을 쓴다 */
  modelUrl: string | null;
  placeholder: { look: PlaceholderLook; color: string };
  /** 모양과 충돌 도형에 함께 곱한다 */
  scale: number;
  /** 집게가 감싸는 몸통 반지름(scale 적용 전) */
  coreRadius: number;
  /** scale 적용 전 치수 */
  colliders: readonly DollCollider[];
  /** 이 종류만 난이도를 덮어쓸 때 */
  tuning?: Partial<GrabTuning>;
}

/** scale을 적용한 뒤 종류별로 계산한 집게 기준 치수 */
export interface DollMetrics {
  coreRadius: number;
  holdOffset: number;
  stopOffset: number;
  blockRadius: number;
  reachRadius: number;
}

/** 배출구 범위와 집게가 돌아갈 자리 */
export interface CabinetLayout {
  chuteSize: number;
  chuteMinX: number;
  chuteMaxX: number;
  chuteMinZ: number;
  chuteMaxZ: number;
  home: Vec2;
}

/** 물리에서 읽은 인형 하나의 현재 위치 */
export interface DollSnapshot {
  id: string;
  kindId: string;
  x: number;
  y: number;
  z: number;
}

/** 집게가 잡고 있는 인형과 놓칠 시점 */
export interface HeldDoll {
  dollId: string;
  kindId: string;
  /** 잡은 뒤 몇 초에 놓치는지. 끝까지 들면 Infinity */
  slipAt: number;
  /** 잡은 뒤 지난 시간(초) */
  heldTime: number;
}

/** 인형 종류 id로 그 종류의 치수와 난이도를 찾는다 */
export interface DollLookup {
  metricsOf(kindId: string): DollMetrics;
  tuningOf(kindId: string): GrabTuning;
}

/** 시도 한 번의 단계: 대기 → 내리기 → 오므리기 → 올리기 → 옮기기 → 놓기 */
export type ClawPhase = 'idle' | 'drop' | 'close' | 'lift' | 'carry' | 'release';

/** 매 프레임 새로 만드는 집게 상태. x·z는 흔들림을 뺀 실제 위치다. */
export interface ClawState {
  phase: ClawPhase;
  /** 지금 단계에 들어온 뒤 지난 시간(초) */
  phaseTime: number;
  x: number;
  z: number;
  /** 집게 중심 높이 */
  hubY: number;
  /** 0 벌림 ~ 1 오므림 */
  closeAmount: number;
  /** 오므리는 동안 정해 둔 결과 */
  pendingGrab: HeldDoll | null;
  held: HeldDoll | null;
  /** 연속으로 실패한 횟수 */
  failStreak: number;
  /** 이번 시도에서 인형을 뽑았는지 */
  wonThisTry: boolean;
}

/** 집게 상태 흐름이 장면·소리 쪽에 알리는 일 */
export type ClawEvent =
  | { type: 'dropStarted' }
  | { type: 'grabbed'; dollId: string }
  | { type: 'missed' }
  | { type: 'slipped'; dollId: string }
  | { type: 'released'; dollId: string | null }
  | { type: 'tryEnded'; won: boolean };
