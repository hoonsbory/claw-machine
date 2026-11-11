import type { DollCollider, DollKind } from '../game/types';

/** 임시 인형 공통 몸통 반지름(scale 적용 전) */
const PLACEHOLDER_CORE_RADIUS = 0.5;
const PLACEHOLDER_HEAD_RADIUS = 0.36;
const PLACEHOLDER_HEAD_Y = 0.62;

/** 임시 인형 공통 충돌 도형: 원점의 몸통 공 + 위쪽 머리 공 */
const PLACEHOLDER_COLLIDERS: readonly DollCollider[] = [
  { shape: 'ball', radius: PLACEHOLDER_CORE_RADIUS, offset: [0, 0, 0] },
  { shape: 'ball', radius: PLACEHOLDER_HEAD_RADIUS, offset: [0, PLACEHOLDER_HEAD_Y, 0] },
];

/**
 * 게임에 나오는 인형 종류. 종류를 바꾸거나 고칠 때는 이 목록과 public/dolls/ 만 고친다.
 * 지금은 실제 인형이 정해지기 전이라 임시 도형 5종이다(가장 큰 것이 가장 작은 것의 두 배).
 */
export const DOLL_KINDS: readonly DollKind[] = [
  {
    id: 'bear',
    displayName: '곰',
    modelUrl: null,
    placeholder: { look: 'bear', color: '#c69c72' },
    scale: 1.0,
    coreRadius: PLACEHOLDER_CORE_RADIUS,
    colliders: PLACEHOLDER_COLLIDERS,
  },
  {
    id: 'bunny',
    displayName: '토끼',
    modelUrl: null,
    placeholder: { look: 'bunny', color: '#d4c2ff' },
    scale: 1.2,
    coreRadius: PLACEHOLDER_CORE_RADIUS,
    colliders: PLACEHOLDER_COLLIDERS,
  },
  {
    id: 'cat',
    displayName: '고양이',
    modelUrl: null,
    placeholder: { look: 'cat', color: '#9ecbff' },
    scale: 0.85,
    coreRadius: PLACEHOLDER_CORE_RADIUS,
    colliders: PLACEHOLDER_COLLIDERS,
  },
  {
    id: 'chick',
    displayName: '병아리',
    modelUrl: null,
    placeholder: { look: 'chick', color: '#ffe066' },
    scale: 0.7,
    coreRadius: PLACEHOLDER_CORE_RADIUS,
    colliders: PLACEHOLDER_COLLIDERS,
  },
  {
    id: 'frog',
    displayName: '개구리',
    modelUrl: null,
    placeholder: { look: 'frog', color: '#8fd694' },
    scale: 1.4,
    coreRadius: PLACEHOLDER_CORE_RADIUS,
    colliders: PLACEHOLDER_COLLIDERS,
  },
];
