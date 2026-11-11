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
