import type { DollKind } from '../game/types';

/*
 * 게임에 나오는 인형 종류. 실제로 선물할 인형 5종이고, 종류를 바꾸거나 고칠 때는 이 목록과 public/dolls/ 만 고친다.
 *
 * 크기: scale 은 실물 크기 등급으로 정했다. 큰 인형(쿠리만쥬·시사·카니, 20~25cm)은 모두 1.25,
 * 작은 마스코트 인형(하치와레·우사기, 약 12cm)은 그 절반쯤인 0.65 다.
 *
 * 충돌 도형: 다섯 모두 작은 몸통 위에 큰 머리(하치와레는 납작한 별)가 얹힌 모양이라, 집게가 감싸는 첫 공(coreRadius)을
 * 머리(하치와레는 별 가운데)에 두고 modelBaseY 로 모델 바닥을 그 아래로 내렸다. 그다음 공들은 몸통, 그리고 머리 양옆·갈기·집게발·귀·별 끝처럼
 * 튀어나온 곳이다. 치수는 ?debug 의 충돌 도형 선을 모델에 겹쳐 보며 맞췄다(docs/dolls.md 4장).
 */
export const DOLL_KINDS: readonly DollKind[] = [
  {
    id: 'kurimanju',
    displayName: '쿠리만쥬',
    modelUrl: 'dolls/kurimanju.glb',
    placeholder: { look: 'bear', color: '#f3d7b0' },
    scale: 1.25,
    coreRadius: 0.45,
    modelBaseY: -1.05,
    colliders: [
      { shape: 'ball', radius: 0.45, offset: [0, 0, 0] },
      { shape: 'ball', radius: 0.33, offset: [0, -0.72, 0.03] },
      { shape: 'ball', radius: 0.3, offset: [-0.28, -0.05, 0] },
      { shape: 'ball', radius: 0.3, offset: [0.28, -0.05, 0] },
    ],
  },
  {
    id: 'shisa',
    displayName: '시사',
    modelUrl: 'dolls/shisa.glb',
    placeholder: { look: 'cat', color: '#f9e7b5' },
    scale: 1.25,
    coreRadius: 0.42,
    modelBaseY: -1.0,
    colliders: [
      { shape: 'ball', radius: 0.42, offset: [0, 0, 0] },
      { shape: 'ball', radius: 0.33, offset: [0, -0.67, 0] },
      { shape: 'ball', radius: 0.3, offset: [-0.42, -0.05, 0] },
      { shape: 'ball', radius: 0.3, offset: [0.42, -0.05, 0] },
    ],
  },
  {
    id: 'kani',
    displayName: '카니',
    modelUrl: 'dolls/kani.glb',
    placeholder: { look: 'bear', color: '#f7b7ad' },
    scale: 1.25,
    coreRadius: 0.48,
    modelBaseY: -0.8,
    colliders: [
      { shape: 'ball', radius: 0.48, offset: [0, 0, 0] },
      { shape: 'ball', radius: 0.28, offset: [0, -0.52, 0] },
      { shape: 'ball', radius: 0.17, offset: [-0.33, 0.53, 0] },
      { shape: 'ball', radius: 0.17, offset: [0.33, 0.53, 0] },
    ],
  },
  {
    id: 'hachiware',
    displayName: '하치와레',
    modelUrl: 'dolls/hachiware.glb',
    placeholder: { look: 'cat', color: '#b8cff0' },
    scale: 0.65,
    coreRadius: 0.24,
    modelBaseY: -0.72,
    colliders: [
      { shape: 'ball', radius: 0.24, offset: [0, 0, 0] },
      { shape: 'capsule', halfHeight: 0.5, radius: 0.2, offset: [0, 0, 0] },
      { shape: 'ball', radius: 0.21, offset: [-0.42, 0.28, 0] },
      { shape: 'ball', radius: 0.21, offset: [0.42, 0.28, 0] },
    ],
  },
  {
    id: 'usagi',
    displayName: '우사기',
    modelUrl: 'dolls/usagi.glb',
    placeholder: { look: 'bunny', color: '#f2d6a6' },
    scale: 0.65,
    coreRadius: 0.48,
    modelBaseY: -1.0,
    colliders: [
      { shape: 'ball', radius: 0.48, offset: [0, 0, 0] },
      { shape: 'ball', radius: 0.24, offset: [0, -0.76, 0] },
      { shape: 'ball', radius: 0.22, offset: [-0.62, -0.36, 0] },
      { shape: 'ball', radius: 0.22, offset: [0.62, -0.36, 0] },
    ],
  },
];
