import type { GameConfig } from '../config/gameConfig';
import type { DollCollider, DollKind } from './types';

/*
 * 계산 규칙 테스트만 쓰는 고정 자료. 앱 코드는 이 파일을 쓰지 않는다.
 * 실제 카탈로그(dollCatalog.ts)와 설정(gameConfig.ts)은 인형을 바꾸거나 수치를 맞출 때 고치는 곳이라,
 * 테스트가 그 값에 묶이지 않도록 지금의 임시 인형 5종과 시제품 시작값을 여기에 그대로 베껴 둔다.
 * 실제 카탈로그·설정이 지켜야 할 조건은 src/config/dollCatalog.test.ts 하나가 따로 확인한다.
 */

const CORE_RADIUS = 0.5;
const HEAD_RADIUS = 0.36;
const HEAD_Y = 0.62;

const COLLIDERS: readonly DollCollider[] = [
  { shape: 'ball', radius: CORE_RADIUS, offset: [0, 0, 0] },
  { shape: 'ball', radius: HEAD_RADIUS, offset: [0, HEAD_Y, 0] },
];

/** 임시 인형 5종(가장 큰 개구리 1.4 가 가장 작은 병아리 0.7 의 두 배) */
export const TEST_DOLL_KINDS: readonly DollKind[] = [
  {
    id: 'bear',
    displayName: '곰',
    modelUrl: null,
    placeholder: { look: 'bear', color: '#c69c72' },
    scale: 1.0,
    coreRadius: CORE_RADIUS,
    colliders: COLLIDERS,
  },
  {
    id: 'bunny',
    displayName: '토끼',
    modelUrl: null,
    placeholder: { look: 'bunny', color: '#d4c2ff' },
    scale: 1.2,
    coreRadius: CORE_RADIUS,
    colliders: COLLIDERS,
  },
  {
    id: 'cat',
    displayName: '고양이',
    modelUrl: null,
    placeholder: { look: 'cat', color: '#9ecbff' },
    scale: 0.85,
    coreRadius: CORE_RADIUS,
    colliders: COLLIDERS,
  },
  {
    id: 'chick',
    displayName: '병아리',
    modelUrl: null,
    placeholder: { look: 'chick', color: '#ffe066' },
    scale: 0.7,
    coreRadius: CORE_RADIUS,
    colliders: COLLIDERS,
  },
  {
    id: 'frog',
    displayName: '개구리',
    modelUrl: null,
    placeholder: { look: 'frog', color: '#8fd694' },
    scale: 1.4,
    coreRadius: CORE_RADIUS,
    colliders: COLLIDERS,
  },
];

/** 시제품에서 가져온 시작값 */
export const TEST_GAME_CONFIG: GameConfig = {
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
    gravityY: -20, maxFrameTime: 0.05, timeStep: 1 / 60,
    doll: { friction: 0.5, restitution: 0.15, linearDamping: 0.05, angularDamping: 0.35 },
    wall: { friction: 0.7, restitution: 0.05 },
  },
};
