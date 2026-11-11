# 인형뽑기 선물 게임 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 선물 인형 5종류를 본뜬, 폰 세로 화면용 3D 인형뽑기 웹 게임을 임시 인형으로 끝까지 플레이 가능하게 만든다.

**Architecture:** 집게 상태 흐름·집기 판정·수집 규칙·진행 저장은 React와 3D를 모르는 순수 TypeScript 모듈(`src/game/`)에 두고 단위 테스트한다. react-three-fiber 장면(`src/scene/`)은 매 프레임 물리 엔진에서 인형 위치를 읽어 순수 모듈에 넘기고, 돌려받은 상태를 집게와 인형에 반영한다. 조이스틱·버튼·축하 화면은 일반 React 컴포넌트(`src/ui/`)다.

**Tech Stack:** Vite 8, React 19, TypeScript, three 0.187, @react-three/fiber 9, @react-three/drei 10, @react-three/rapier 2, @emotion/css 11, Vitest 5, ESLint(typescript-eslint).

**Spec:** `docs/superpowers/specs/2026-11-11-claw-machine-design.md` — 실행자는 이 계획과 함께 반드시 읽는다. 수치의 출처는 `spike/claw-feel/main.js` 다.

## Global Constraints

- 폰 세로 화면과 터치가 기준이다. 노트북에서는 화면 가운데 9:16 세로 틀 안에 같은 화면이 뜨고 방향키·스페이스로 조작한다. 가로 배치는 만들지 않는다.
- `src/game/` 아래 파일은 `react`, `three`, `@react-three/*`, DOM 전역(`window`, `localStorage`, `document`)을 import하거나 직접 참조하지 않는다. 난수와 저장소는 인자로 받는다.
- 조정 가능한 수치는 전부 `src/config/gameConfig.ts` 한 곳에 둔다. 다른 파일에 숫자 리터럴로 다시 쓰지 않는다.
- 인형 종류를 바꾸는 일은 `public/dolls/` 에 파일을 넣고 `src/config/dollCatalog.ts` 를 고치는 것으로 끝나야 한다.
- 코드 규칙: `any` 금지, 모든 함수에 명시적 반환 타입, props는 명시적 `interface`, Emotion은 `@emotion/css` 의 `css` + `className`(styled 금지, `!important` 금지), 매직넘버는 이름 붙인 상수, early return, 중첩 삼항 금지. 주석·문서·커밋 메시지는 한국어, 식별자는 영어.
- 만들지 않는 것: 메시지 카드, 마무리 화면, 모음 화면, 꽝 인형, 로그인·서버, 화면에 보이는 초기화 버튼, 실패가 쌓일 때 닿는 범위를 넓히거나 배출구로 강제로 넣는 추가 도움 규칙.
- 특정 기존 게임·브랜드·캐릭터의 생김새를 따라 하지 않는다.
- 라이브러리 사용법은 코드를 쓰기 전에 공식 문서로 확인한다(특히 `@react-three/rapier` 2.x의 `RigidBody` 참조 API와 물리 단계 전후 훅).
- 커밋: 태스크마다 1커밋, 커밋 전 `npm run verify` 통과. 커밋 메시지와 본문에 AI 도구 표기를 넣지 않는다. git 계정은 저장소 로컬 설정(`git config --get user.email`)을 그대로 쓴다.
- TypeScript·ESLint·typescript-eslint 버전은 `create-vite` 의 `react-ts` 템플릿이 정한 것을 그대로 쓴다.

## Review Focus

스펙이 암시하지만 놓치기 쉬운 상황이다. 각 항목의 테스트는 담당 태스크에 들어 있다.

1. 브라우저 저장소가 막혀 있거나(사생활 보호 모드) 저장된 값이 깨져 있다 → 오류 없이 빈 기록으로 시작한다. (Task 5)
2. 같은 종류 인형 두 개가 거의 동시에 배출구에 들어간다 → 획득은 한 번만 처리된다. (Task 5)
3. 집게가 들고 가는 인형이 같은 종류 획득으로 사라진다 → 집게는 빈손으로 남은 동작을 마치고 그 시도는 실패로 세지 않는다. (Task 4)
4. 탭이 뒤로 갔다 돌아와 한 프레임 시간이 매우 크다 → 집게가 바닥이나 이동 한계를 넘지 않는다. (Task 4)
5. 인형이 튕겨서 기계 밖이나 바닥 아래로 나간다 → 기계 안 위쪽에서 다시 떨어진다. (Task 6)

---

## 파일 구조

```
src/
  main.tsx, App.tsx
  config/
    gameConfig.ts       조정 수치 한 묶음
    dollCatalog.ts      인형 5종 설정
  game/                 순수 TypeScript
    types.ts            공용 타입
    dollGeometry.ts     종류별 치수, 기계 배치 계산
    grabJudge.ts        멈춤 높이, 집기 판정
    clawMachine.ts      집게 상태 흐름
    collection.ts       인형 목록, 같은 종류 제거
    progressStore.ts    진행 저장, ?reset
  session/
    useGameSession.ts   React 상태(남은 인형, 뽑은 종류, 축하 화면)
  scene/
    GameCanvas.tsx      Canvas, 카메라, 조명, Physics
    Cabinet.tsx         바닥, 벽, 배출구
    Doll.tsx            인형 하나(강체 + 모양)
    DollModel.tsx       glb 또는 임시 도형
    Claw.tsx            집게 생김새와 흔들림
    useClawLoop.ts      순수 모듈과 물리 연결
  input/
    useMoveInput.ts     조이스틱 + 키보드
  audio/
    sfx.ts              효과음, 진동
  ui/
    Joystick.tsx, DropButton.tsx, Hud.tsx, SoundToggle.tsx, Celebration.tsx, DebugPanel.tsx
docs/dolls.md           인형 교체 안내
```

테스트 파일은 대상 옆에 `*.test.ts` 로 둔다.

---

### Task 1: 프로젝트 뼈대와 검증 명령

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/config/gameConfig.ts`, `src/config/gameConfig.test.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run verify`(= `tsc -b && eslint . && vitest run`). `GAME_CONFIG` 와 타입 `GameConfig`.

- [ ] **Step 1: 브랜치 만들기** — `git switch -c feat/claw-machine-game`
- [ ] **Step 2: 템플릿 생성** — 루트가 비어 있지 않으므로 `npm create vite@latest app-tmp -- --template react-ts` 로 만든 뒤 내용물을 루트로 옮기고 `app-tmp` 를 지운다. 템플릿의 예시 화면·CSS·로고 자산은 지운다.
- [ ] **Step 3: 의존성 추가** — `npm i three @react-three/fiber @react-three/drei @react-three/rapier @emotion/css` , `npm i -D vitest @types/three`
- [ ] **Step 4: 설정**
  - `package.json` scripts에 `"test": "vitest run"`, `"verify": "tsc -b && eslint . && vitest run"` 추가.
  - ESLint에 `@typescript-eslint/no-explicit-any: error`, `@typescript-eslint/explicit-function-return-type: error` 추가. `spike/`, `dist/`, `.claude-worktrees/` 는 lint·test 대상에서 제외.
  - `.gitignore` 에 `node_modules`, `dist`, `.playwright-mcp` 추가.
  - `index.html`: `lang="ko"`, 제목 `인형뽑기`, viewport `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`, `<meta name="robots" content="noindex, nofollow">`.
- [ ] **Step 5: 실패하는 테스트 쓰기** — `src/config/gameConfig.test.ts`

```ts
it('시제품에서 확인한 시작값을 그대로 가진다', () => {
  expect(GAME_CONFIG.grab.grip).toBe(0.6);
  expect(GAME_CONFIG.grab.pityAfterFails).toBe(3);
  expect(GAME_CONFIG.dolls.perKind).toBe(3);
});
```

- [ ] **Step 6: 실패 확인** — `npm test` → `GAME_CONFIG` 를 찾을 수 없어 FAIL
- [ ] **Step 7: `src/config/gameConfig.ts` 작성** — 아래 값을 `as const satisfies GameConfig` 로 내보낸다. `GameConfig` 인터페이스도 이 파일에서 내보낸다.

```ts
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
    pityAfterFails: 3, pityMinQuality: 0.25, holdFollow: 15,
  },
  dolls: { perKind: 3, vanishTime: 0.3, chuteDetectMargin: 0.4, respawnBelowY: -5 },
  physics: { gravityY: -20, maxFrameTime: 0.05 },
} as const satisfies GameConfig;
```

- [ ] **Step 8: 빈 화면 App** — `App.tsx` 는 분홍 배경(`linear-gradient(#ffe3ee, #ffc4dc)`)의 전체 화면 컨테이너와, 그 가운데 9:16 세로 틀(`height: 100dvh; max-width: calc(100dvh * 9 / 16); width: 100%`)만 그린다. 틀과 body에 `touch-action: none; user-select: none; overflow: hidden`.
- [ ] **Step 9: 확인** — `npm run verify` 통과, `npm run build` 성공.
- [ ] **Step 10: 커밋** — `git add -A && git commit -m "chore: Vite React TS 뼈대와 검증 명령 추가"`

---

### Task 2: 인형 카탈로그와 치수 계산

**Files:**
- Create: `src/game/types.ts`, `src/config/dollCatalog.ts`, `src/game/dollGeometry.ts`, `src/game/dollGeometry.test.ts`

**Interfaces:**
- Consumes: `GAME_CONFIG`, `GameConfig`
- Produces:

```ts
// types.ts
export interface Vec2 { x: number; z: number }
export interface Vec3 { x: number; y: number; z: number }
export type DollCollider =
  | { shape: 'ball'; radius: number; offset: readonly [number, number, number] }
  | { shape: 'capsule'; halfHeight: number; radius: number; offset: readonly [number, number, number] };
export type PlaceholderLook = 'bear' | 'bunny' | 'cat' | 'chick' | 'frog';
export interface GrabTuning { grip: number; reachMargin: number }
export interface DollKind {
  id: string;
  displayName: string;
  modelUrl: string | null;            // null이면 임시 도형을 쓴다
  placeholder: { look: PlaceholderLook; color: string };
  scale: number;                      // 모양과 충돌 도형에 함께 곱한다
  coreRadius: number;                 // 집게가 감싸는 몸통 반지름(scale 적용 전)
  colliders: readonly DollCollider[]; // scale 적용 전 치수
  tuning?: Partial<GrabTuning>;       // 이 종류만 난이도를 덮어쓸 때
}
export interface DollMetrics { coreRadius: number; holdOffset: number; stopOffset: number; blockRadius: number; reachRadius: number }
export interface CabinetLayout { chuteSize: number; chuteMinX: number; chuteMaxX: number; chuteMinZ: number; chuteMaxZ: number; home: Vec2 }

// dollGeometry.ts
export function getDollMetrics(kind: DollKind, config: GameConfig): DollMetrics;
export function getGrabTuning(kind: DollKind, config: GameConfig): GrabTuning;
export function getCabinetLayout(kinds: readonly DollKind[], config: GameConfig): CabinetLayout;
export function isInsideChute(position: Vec3, metrics: DollMetrics, layout: CabinetLayout, config: GameConfig): boolean;

// dollCatalog.ts
export const DOLL_KINDS: readonly DollKind[]; // 정확히 5종
```

계산 규칙(스케일 적용 후 `r = kind.coreRadius * kind.scale`):
`holdOffset = r + claw.holdGap`, `stopOffset = holdOffset + claw.stopGap`, `blockRadius = r + claw.blockMargin`, `reachRadius = r + tuning.reachMargin`.
`chuteSize = max(cabinet.chuteMinSize, 가장 큰 r * 2 + cabinet.chuteMargin)`. 배출구는 앞쪽 왼편 구석: `chuteMinX = -floorHalf`, `chuteMaxX = -floorHalf + chuteSize`, `chuteMaxZ = floorHalf`, `chuteMinZ = floorHalf - chuteSize`. `home` 은 배출구 한가운데.
`isInsideChute`: x·z가 배출구 범위 안이고 `position.y < metrics.coreRadius + dolls.chuteDetectMargin`.

임시 5종: id `bear, bunny, cat, chick, frog`, 표시 이름 `곰, 토끼, 고양이, 병아리, 개구리`, scale `1.0, 1.2, 0.85, 0.7, 1.4`, 색은 서로 뚜렷이 다르게, 모두 `modelUrl: null`, `coreRadius: 0.5`, 충돌 도형은 몸통 공(반지름 0.5, 원점)과 머리 공(반지름 0.36, y 0.62) 두 개.

- [ ] **Step 1: 실패하는 테스트 쓰기**

```ts
const kind = (scale: number, tuning?: Partial<GrabTuning>): DollKind => ({ ...DOLL_KINDS[0], scale, tuning });

it('시제품과 같은 크기면 시제품 치수가 나온다', () => {
  expect(getDollMetrics(kind(1), GAME_CONFIG)).toEqual({ coreRadius: 0.5, holdOffset: 0.75, stopOffset: 0.8, blockRadius: 0.75, reachRadius: 0.85 });
});
it('큰 인형은 치수가 함께 커진다', () => {
  const m = getDollMetrics(kind(1.4), GAME_CONFIG);
  expect(m.coreRadius).toBeCloseTo(0.7);
  expect(m.holdOffset).toBeCloseTo(0.95);
});
it('종류별 덮어쓰기가 공통 수치보다 우선한다', () => {
  expect(getGrabTuning(kind(1, { grip: 0.9 }), GAME_CONFIG)).toEqual({ grip: 0.9, reachMargin: 0.35 });
});
it('배출구는 가장 큰 인형에 맞춰지고 집게 이동 범위 안에 있다', () => {
  const layout = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
  expect(layout.chuteSize).toBeCloseTo(2.2);
  expect(layout.home).toEqual({ x: expect.closeTo(-1.9), z: expect.closeTo(1.9) });
  expect(Math.abs(layout.home.x)).toBeLessThanOrEqual(GAME_CONFIG.claw.moveLimit);
});
it('카탈로그는 5종이고 id가 겹치지 않으며 가장 큰 것이 가장 작은 것의 두 배다', () => {
  expect(new Set(DOLL_KINDS.map((k) => k.id)).size).toBe(5);
  const scales = DOLL_KINDS.map((k) => k.scale);
  expect(Math.max(...scales) / Math.min(...scales)).toBeCloseTo(2);
});
it('배출구 안 바닥에 놓인 인형만 들어간 것으로 본다', () => {
  const layout = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
  const m = getDollMetrics(kind(1), GAME_CONFIG);
  expect(isInsideChute({ x: -1.9, y: 0.5, z: 1.9 }, m, layout, GAME_CONFIG)).toBe(true);
  expect(isInsideChute({ x: -1.9, y: 3, z: 1.9 }, m, layout, GAME_CONFIG)).toBe(false);
  expect(isInsideChute({ x: 0, y: 0.5, z: 0 }, m, layout, GAME_CONFIG)).toBe(false);
});
```

- [ ] **Step 2: 실패 확인** — `npm test -- dollGeometry` → FAIL
- [ ] **Step 3: `types.ts`, `dollCatalog.ts`, `dollGeometry.ts` 구현**
- [ ] **Step 4: 통과 확인** — `npm run verify`
- [ ] **Step 5: 커밋** — `git commit -m "feat: 인형 카탈로그와 종류별 치수 계산 추가"`

---

### Task 3: 집기 판정

**Files:**
- Create: `src/game/grabJudge.ts`, `src/game/grabJudge.test.ts`
- Modify: `src/game/types.ts`

**Interfaces:**
- Consumes: `DollMetrics`, `GrabTuning`, `GameConfig`
- Produces:

```ts
// types.ts 에 추가
export interface DollSnapshot { id: string; kindId: string; x: number; y: number; z: number } // 물리에서 읽은 현재 위치
export interface HeldDoll { dollId: string; kindId: string; slipAt: number; heldTime: number } // slipAt: 잡은 뒤 몇 초에 놓치는지, 끝까지 들면 Infinity
export interface DollLookup { metricsOf(kindId: string): DollMetrics; tuningOf(kindId: string): GrabTuning }

// grabJudge.ts
export function createDollLookup(kinds: readonly DollKind[], config: GameConfig): DollLookup;
export function findStopHeight(claw: Vec2, dolls: readonly DollSnapshot[], lookup: DollLookup, config: GameConfig): number;
export function decideGrab(input: {
  claw: Vec2; hubY: number; dolls: readonly DollSnapshot[]; failStreak: number;
  lookup: DollLookup; config: GameConfig; rng: () => number;
}): HeldDoll | null;
```

규칙:
- `findStopHeight`: 집게와의 수평 거리가 그 인형의 `blockRadius` 이하인 인형들에 대해 `doll.y + stopOffset` 의 최댓값. 없으면 `claw.hubMinY`. 결과는 `hubMinY` 보다 작아지지 않는다.
- `decideGrab` 대상: 수평 거리 `d < reachRadius` 이고 `doll.y < hubY - holdOffset + coreRadius` 인 인형 중 `d` 가 가장 작은 것. 없으면 `null`.
- `quality = 1 - d / reachRadius`, `holdChance = clamp(grip * holdChanceScale * (holdChanceBase + (1 - holdChanceBase) * quality), 0, 1)`.
- 보정: `failStreak >= pityAfterFails` 이고 `quality >= pityMinQuality` 이면 반드시 끝까지 든다.
- `rng()` 는 정확히 이 순서로 쓴다: 첫 번째 값 `< holdChance` 이면 끝까지 든다(`slipAt = Infinity`). 아니면 두 번째 값으로 `slipAt = slipMinTime + rng() * (slipMaxTime - slipMinTime)`.

- [ ] **Step 1: 실패하는 테스트 쓰기** — 테스트용 도우미 `doll(id, kindId, x, y, z)` 와 `seq(...values)`(차례로 값을 돌려주는 rng)를 파일 안에 둔다. `lookup = createDollLookup(DOLL_KINDS, GAME_CONFIG)`.

```ts
it('아래에 인형이 없으면 바닥 근처에서 멈춘다', () => {
  expect(findStopHeight({ x: 0, z: 0 }, [], lookup, GAME_CONFIG)).toBe(0.95);
});
it('인형 위에서는 그 인형 크기에 맞는 높이에서 멈춘다', () => {
  expect(findStopHeight({ x: 0, z: 0 }, [doll('a', 'bear', 0.2, 0.5, 0)], lookup, GAME_CONFIG)).toBeCloseTo(1.3);
  expect(findStopHeight({ x: 0, z: 0 }, [doll('b', 'frog', 0.2, 0.7, 0)], lookup, GAME_CONFIG)).toBeCloseTo(1.7);
});
it('닿는 범위에 인형이 없으면 잡지 못한다', () => {
  expect(decideGrab({ ...base, dolls: [doll('a', 'bear', 2, 0.5, 0)] })).toBeNull();
});
it('여럿이 닿으면 가장 가까운 것을 잡는다', () => {
  const held = decideGrab({ ...base, dolls: [doll('far', 'bear', 0.6, 0.5, 0), doll('near', 'bear', 0.1, 0.5, 0)], rng: seq(0) });
  expect(held?.dollId).toBe('near');
});
it('정중앙을 잡으면 운이 0.77이어도 끝까지 든다', () => {
  // grip 0.6 * 1.3 * 1.0 = 0.78
  expect(decideGrab({ ...base, dolls: [doll('a', 'bear', 0, 0.5, 0)], rng: seq(0.77) })?.slipAt).toBe(Infinity);
});
it('빗겨 잡고 운이 나쁘면 정해진 시간 범위 안에서 놓친다', () => {
  const held = decideGrab({ ...base, dolls: [doll('a', 'bear', 0.6, 0.5, 0)], rng: seq(0.99, 0.5) });
  expect(held?.slipAt).toBeCloseTo(1.45); // 0.5 + 0.5 * (2.4 - 0.5)
});
it('3번 연속 실패 뒤에는 어느 정도만 잡아도 끝까지 든다', () => {
  // d 0.6, reach 0.85 → quality 약 0.29 ≥ 0.25
  expect(decideGrab({ ...base, failStreak: 3, dolls: [doll('a', 'bear', 0.6, 0.5, 0)], rng: seq(0.99, 0.5) })?.slipAt).toBe(Infinity);
});
it('보정이 걸려도 너무 빗겨 잡으면 보장하지 않는다', () => {
  // d 0.8 → quality 약 0.06 < 0.25
  expect(decideGrab({ ...base, failStreak: 3, dolls: [doll('a', 'bear', 0.8, 0.5, 0)], rng: seq(0.99, 0.5) })?.slipAt).not.toBe(Infinity);
});
it('종류별 집게 힘 덮어쓰기를 따른다', () => {
  const strong = createDollLookup([{ ...DOLL_KINDS[0], tuning: { grip: 1 } }], GAME_CONFIG);
  expect(decideGrab({ ...base, lookup: strong, dolls: [doll('a', 'bear', 0.4, 0.5, 0)], rng: seq(0.8) })?.slipAt).toBe(Infinity);
});
it('집게보다 높이 쌓인 인형은 잡지 않는다', () => {
  expect(decideGrab({ ...base, hubY: 0.95, dolls: [doll('a', 'bear', 0, 3, 0)] })).toBeNull();
});
```

`base` = `{ claw: { x: 0, z: 0 }, hubY: 1.3, dolls: [], failStreak: 0, lookup, config: GAME_CONFIG, rng: seq(0) }`.

- [ ] **Step 2: 실패 확인** — `npm test -- grabJudge` → FAIL
- [ ] **Step 3: `grabJudge.ts` 구현**
- [ ] **Step 4: 통과 확인** — `npm run verify`
- [ ] **Step 5: 커밋** — `git commit -m "feat: 집기 판정과 연속 실패 보정 추가"`

---

### Task 4: 집게 상태 흐름

**Files:**
- Create: `src/game/clawMachine.ts`, `src/game/clawMachine.test.ts`
- Modify: `src/game/types.ts`

**Interfaces:**
- Consumes: `findStopHeight`, `decideGrab`, `DollLookup`, `CabinetLayout`, `HeldDoll`, `DollSnapshot`
- Produces:

```ts
// types.ts 에 추가
export type ClawPhase = 'idle' | 'drop' | 'close' | 'lift' | 'carry' | 'release';
export interface ClawState {
  phase: ClawPhase; phaseTime: number;
  x: number; z: number; hubY: number;
  closeAmount: number;              // 0 벌림 ~ 1 오므림
  pendingGrab: HeldDoll | null;     // 오므리는 동안 정해 둔 결과
  held: HeldDoll | null;
  failStreak: number; wonThisTry: boolean;
}
export type ClawEvent =
  | { type: 'dropStarted' }
  | { type: 'grabbed'; dollId: string }
  | { type: 'missed' }
  | { type: 'slipped'; dollId: string }
  | { type: 'released'; dollId: string | null }
  | { type: 'tryEnded'; won: boolean };

// clawMachine.ts
export interface ClawDeps { config: GameConfig; lookup: DollLookup; layout: CabinetLayout; rng: () => number }
export interface ClawInput { move: Vec2; dropRequested: boolean; dolls: readonly DollSnapshot[]; dt: number }
export function createClawState(layout: CabinetLayout, config: GameConfig): ClawState; // home 위, hubRestY, idle
export function stepClaw(state: ClawState, input: ClawInput, deps: ClawDeps): { state: ClawState; events: ClawEvent[] };
export function markWin(state: ClawState): ClawState;                      // wonThisTry = true, failStreak = 0
export function forgetDolls(state: ClawState, removedIds: readonly string[]): ClawState; // held·pendingGrab이 사라진 인형이면 비운다
export function getHoldHeight(state: ClawState, deps: ClawDeps): number | null;         // 들고 있지 않으면 null
```

흐름(`stepClaw` 는 입력 상태를 바꾸지 않고 새 상태를 돌려준다):
- 맨 처음에 `dt = min(input.dt, physics.maxFrameTime)` 로 자른다.
- `idle`: `move`(각 축 -1~1)에 `moveSpeed * dt` 를 곱해 이동, x·z를 `±moveLimit` 로 자른다. `dropRequested` 면 `drop` 으로 가며 `dropStarted`, `wonThisTry = false`.
- `idle` 이 아닐 때 `dropRequested` 와 `move` 는 무시한다.
- `drop`: `hubY -= dropSpeed * dt`. `findStopHeight` 이하가 되면 그 높이에 맞추고 `pendingGrab = decideGrab(...)`, `close` 로.
- `close`: `closeAmount = min(phaseTime / closeTime, 1)`. `closeTime` 이 지나면 `held = pendingGrab`, 잡았으면 `grabbed`, 아니면 `missed`, `lift` 로.
- `lift`: `hubY` 를 `liftSpeed` 로 올려 `hubRestY` 에 닿으면 `carry`.
- `carry`: `layout.home` 을 향해 `moveSpeed` 로 직선 이동, 도착하면 `released`(들고 있던 `dollId` 또는 `null`), `held = null`, `release` 로.
- `release`: `closeAmount = max(1 - phaseTime / openTime, 0)`. `releaseTime` 이 지나면 `tryEnded { won: wonThisTry }`, 못 뽑았으면 `failStreak + 1`, `idle` 로.
- 들고 있는 동안(`lift`·`carry`) `held.heldTime += dt`. `heldTime >= slipAt` 이면 `slipped`, `held = null`. 집게는 하던 동작을 계속한다.
- `getHoldHeight = hubY - holdOffset - sag * sagDepth`, `sag = clamp((heldTime - (slipAt - sagTime)) / sagTime, 0, 1)`.
- `forgetDolls` 로 들고 있던 인형이 사라진 시도는 인형이 뽑힌 결과이므로, 호출하는 쪽이 `markWin` 을 함께 부른다(Task 7).

- [ ] **Step 1: 실패하는 테스트 쓰기** — 도우미 `run(fixture, input, seconds, rng = seq(0))` 는 `dt = 1/60` 으로 `stepClaw` 를 반복 호출하며 이벤트를 모은다. `fixture` 는 `{ state, dolls }` 묶음이고, `dropRequested` 는 첫 프레임에만 넣는다(한 번 대기로 돌아온 뒤 두 번째 시도가 시작되지 않게). 고정 묶음: `start`(인형 없음, 처음 상태), `overDoll`(집게가 `bear` 인형 `a` 의 정중앙 위), `overNothing`(인형 `a` 가 있지만 집게는 3 이상 떨어진 곳).

```ts
it('대기 중에는 입력대로 움직이고 이동 한계를 넘지 않는다', () => {
  const { state } = run(start, { move: { x: 1, z: -1 } }, 5);
  expect(state.x).toBe(2.5);
  expect(state.z).toBe(-2.5);
});
it('인형을 잡아 배출구 위까지 옮긴 뒤 놓고 대기로 돌아온다', () => {
  const { state, events } = run(overDoll, { dropRequested: true }, 12);
  expect(events.map((e) => e.type)).toEqual(['dropStarted', 'grabbed', 'released', 'tryEnded']);
  expect(events[2]).toEqual({ type: 'released', dollId: 'a' });
  expect(state.phase).toBe('idle');
  expect({ x: state.x, z: state.z }).toEqual(layout.home);
});
it('허공을 집으면 missed 이고 실패가 하나 쌓인다', () => {
  const { state, events } = run(overNothing, { dropRequested: true }, 12);
  expect(events.map((e) => e.type)).toEqual(['dropStarted', 'missed', 'released', 'tryEnded']);
  expect(state.failStreak).toBe(1);
});
it('놓치기로 정해진 인형은 도중에 떨어지고 집게는 끝까지 돌아간다', () => {
  const { state, events } = run(overDoll, { dropRequested: true }, 12, seq(0.99, 0));
  expect(events.map((e) => e.type)).toEqual(['dropStarted', 'grabbed', 'slipped', 'released', 'tryEnded']);
  expect(events[3]).toEqual({ type: 'released', dollId: null });
  expect(state.failStreak).toBe(1);
});
it('놓치기 직전에는 인형이 처진다', () => {
  // slipAt 0.5초로 잡은 뒤 0.3초 지점과 0.49초 지점의 getHoldHeight 를 비교
  expect(late).toBeLessThan(early);
});
it('시도 중에는 내리기와 이동 입력을 무시한다', () => {
  const dropping = stepClaw(start, { ...idleInput, dropRequested: true }, deps).state;
  const next = stepClaw(dropping, { ...idleInput, dropRequested: true, move: { x: 1, z: 0 } }, deps);
  expect(next.events).toEqual([]);
  expect(next.state.x).toBe(dropping.x);
});
it('markWin 뒤에 끝난 시도는 실패로 세지 않는다', () => {
  // 놓은 직후 markWin → tryEnded.won 이 true 이고 failStreak 이 0
});
it('들고 있던 인형이 사라지면 빈손으로 동작을 마친다 (Review Focus 3)', () => {
  // lift 도중 forgetDolls(state, ['a']) → held 가 null, 이후 released.dollId 가 null, 오류 없음
});
it('한 프레임이 매우 길어도 바닥과 이동 한계를 넘지 않는다 (Review Focus 4)', () => {
  const dropping = stepClaw(start, { ...idleInput, dropRequested: true }, deps).state;
  const next = stepClaw(dropping, { ...idleInput, dt: 30 }, deps).state;
  expect(next.hubY).toBeGreaterThanOrEqual(GAME_CONFIG.claw.hubMinY);
  const moved = stepClaw(start, { ...idleInput, move: { x: 1, z: 1 }, dt: 30 }, deps).state;
  expect(moved.x).toBeLessThanOrEqual(GAME_CONFIG.claw.moveLimit);
});
it('입력 상태를 바꾸지 않는다', () => {
  const frozen = Object.freeze({ ...start });
  expect(() => stepClaw(frozen, { ...idleInput, move: { x: 1, z: 0 } }, deps)).not.toThrow();
});
```

- [ ] **Step 2: 실패 확인** — `npm test -- clawMachine` → FAIL
- [ ] **Step 3: `clawMachine.ts` 구현** — 단계별 처리를 작은 함수로 나누고 `stepClaw` 는 `switch (state.phase)` 로 넘긴다.
- [ ] **Step 4: 통과 확인** — `npm run verify`
- [ ] **Step 5: 커밋** — `git commit -m "feat: 집게 상태 흐름 추가"`

---

### Task 5: 수집 규칙과 진행 저장

**Files:**
- Create: `src/game/collection.ts`, `src/game/collection.test.ts`, `src/game/progressStore.ts`, `src/game/progressStore.test.ts`

**Interfaces:**
- Consumes: `DollKind`
- Produces:

```ts
// collection.ts
export interface DollInstance { id: string; kindId: string } // id 는 `${kindId}-${번호}`
export function createInstances(kinds: readonly DollKind[], perKind: number, wonKindIds: ReadonlySet<string>): DollInstance[];
export interface WinResult { wonKindId: string; removedIds: string[]; remaining: DollInstance[]; wonKindIds: Set<string>; isComplete: boolean }
export function applyWin(instances: readonly DollInstance[], wonKindIds: ReadonlySet<string>, dollId: string, totalKinds: number): WinResult | null;

// progressStore.ts
export const PROGRESS_KEY = 'claw-machine:won-kinds:v1';
export interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function loadWonKinds(storage: KeyValueStorage, validKindIds: readonly string[]): Set<string>;
export function saveWonKinds(storage: KeyValueStorage, wonKindIds: ReadonlySet<string>): void;
export function consumeResetFlag(search: string, storage: KeyValueStorage): boolean; // ?reset 이 있으면 기록을 지우고 true
```

규칙:
- `createInstances` 는 이미 뽑은 종류를 빼고 종류당 `perKind` 개를 만든다.
- `applyWin` 은 모르는 `dollId` 이거나 그 종류를 이미 뽑았으면 `null`. 아니면 그 종류의 남은 인형 전부(뽑힌 것 포함)를 `removedIds` 로 돌려준다.
- 저장 형식은 종류 id 문자열 배열의 JSON. `loadWonKinds` 는 저장소 접근이 예외를 던지거나, JSON이 깨졌거나, 배열이 아니면 빈 집합을 돌려주고, `validKindIds` 에 없는 id는 버린다. `saveWonKinds` 와 `consumeResetFlag` 도 저장소 예외를 삼킨다.
- `consumeResetFlag` 는 `?reset`, `?reset=1`, `?debug&reset` 모두 인정한다.

- [ ] **Step 1: 실패하는 테스트 쓰기**

```ts
// collection.test.ts
it('종류당 3개씩 15개를 만든다', () => {
  expect(createInstances(DOLL_KINDS, 3, new Set())).toHaveLength(15);
});
it('이미 뽑은 종류는 만들지 않는다', () => {
  const list = createInstances(DOLL_KINDS, 3, new Set(['bear']));
  expect(list).toHaveLength(12);
  expect(list.some((d) => d.kindId === 'bear')).toBe(false);
});
it('한 종류를 뽑으면 같은 종류가 모두 빠진다', () => {
  const all = createInstances(DOLL_KINDS, 3, new Set());
  const result = applyWin(all, new Set(), 'bear-1', 5);
  expect(result?.removedIds.sort()).toEqual(['bear-0', 'bear-1', 'bear-2']);
  expect(result?.remaining).toHaveLength(12);
  expect(result?.isComplete).toBe(false);
});
it('같은 종류가 연달아 들어와도 획득은 한 번이다 (Review Focus 2)', () => {
  const all = createInstances(DOLL_KINDS, 3, new Set());
  const first = applyWin(all, new Set(), 'bear-1', 5);
  expect(applyWin(first!.remaining, first!.wonKindIds, 'bear-2', 5)).toBeNull();
  expect(applyWin(all, new Set(['bear']), 'bear-2', 5)).toBeNull();
});
it('다섯 번째 종류를 뽑으면 완료다', () => {
  const won = new Set(['bear', 'bunny', 'cat', 'chick']);
  expect(applyWin(createInstances(DOLL_KINDS, 3, won), won, 'frog-0', 5)?.isComplete).toBe(true);
});
it('모르는 인형은 무시한다', () => {
  expect(applyWin([], new Set(), 'ghost-0', 5)).toBeNull();
});

// progressStore.test.ts — memoryStorage() 와 throwingStorage() 도우미를 파일 안에 둔다
it('저장한 것을 그대로 읽는다', () => {
  const s = memoryStorage();
  saveWonKinds(s, new Set(['bear', 'frog']));
  expect(loadWonKinds(s, ids)).toEqual(new Set(['bear', 'frog']));
});
it('깨진 값·배열이 아닌 값·모르는 id는 버린다 (Review Focus 1)', () => {
  expect(loadWonKinds(memoryStorage({ [PROGRESS_KEY]: '{oops' }), ids)).toEqual(new Set());
  expect(loadWonKinds(memoryStorage({ [PROGRESS_KEY]: '"bear"' }), ids)).toEqual(new Set());
  expect(loadWonKinds(memoryStorage({ [PROGRESS_KEY]: '["bear","dragon",3]' }), ids)).toEqual(new Set(['bear']));
});
it('저장소가 막혀 있어도 오류 없이 빈 기록으로 동작한다 (Review Focus 1)', () => {
  const s = throwingStorage();
  expect(loadWonKinds(s, ids)).toEqual(new Set());
  expect(() => saveWonKinds(s, new Set(['bear']))).not.toThrow();
  expect(() => consumeResetFlag('?reset', s)).not.toThrow();
});
it('?reset 이 있을 때만 기록을 지운다', () => {
  const s = memoryStorage({ [PROGRESS_KEY]: '["bear"]' });
  expect(consumeResetFlag('?debug', s)).toBe(false);
  expect(loadWonKinds(s, ids)).toEqual(new Set(['bear']));
  expect(consumeResetFlag('?debug&reset', s)).toBe(true);
  expect(loadWonKinds(s, ids)).toEqual(new Set());
});
```

- [ ] **Step 2: 실패 확인** — `npm test -- collection progressStore` → FAIL
- [ ] **Step 3: 두 파일 구현**
- [ ] **Step 4: 통과 확인** — `npm run verify`
- [ ] **Step 5: 커밋** — `git commit -m "feat: 같은 종류 제거 규칙과 진행 저장 추가"`

---

### Task 6: 3D 기계와 인형 물리

**Files:**
- Create: `src/scene/GameCanvas.tsx`, `src/scene/Cabinet.tsx`, `src/scene/Doll.tsx`, `src/scene/DollModel.tsx`, `src/game/spawn.ts`, `src/game/spawn.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `DOLL_KINDS`, `GAME_CONFIG`, `getCabinetLayout`, `createInstances`, `DollInstance`, `DollKind`
- Produces:

```ts
// spawn.ts (순수)
export function pickSpawnPoint(index: number, layout: CabinetLayout, config: GameConfig, rng: () => number): Vec3;
export function isOutOfBounds(position: Vec3, config: GameConfig): boolean;

// Doll.tsx
export interface DollHandle { getPosition(): Vec3; setVelocityToward(target: Vec3, follow: number): void; respawn(position: Vec3): void }
export interface DollProps { instance: DollInstance; kind: DollKind; spawnAt: Vec3; isVanishing: boolean; onVanished: (id: string) => void; register: (id: string, handle: DollHandle | null) => void }
// DollModel.tsx
export interface DollModelProps { kind: DollKind } // modelUrl 이 null 이면 placeholder.look 에 따른 임시 도형
// GameCanvas.tsx
export interface GameCanvasProps { instances: readonly DollInstance[]; vanishingIds: ReadonlySet<string>; onVanished: (id: string) => void; children?: ReactNode } // children 은 Physics 안에 그려진다
```

정해 둔 것:
- 카메라: 위치 `(0, 14, 22)`, 바라보는 점 `(0, -1.2, 0)`, 세로 시야각은 `2 * atan(0.175 / 화면비)`(화면비 = 폭/높이). 플레이어가 돌릴 수 없다.
- 물리: 중력 `physics.gravityY`. 바닥·네 벽·배출구 칸막이 두 장은 고정 충돌체, 치수는 `GAME_CONFIG.cabinet` 과 `getCabinetLayout` 에서만 가져온다. 앞벽은 충돌만 있고 보이지 않는다. 옆벽은 반투명, 배출구 바닥은 어두운 색.
- 인형: 강체 하나에 `kind.colliders` 를 `kind.scale` 배로 붙인다. 모양(`DollModel`)도 같은 배율. 임시 도형은 몸통·머리·얼굴 공통에 `look` 별 귀 모양(둥근 귀, 긴 귀, 뾰족 귀, 볏, 큰 눈)만 다르게 한다.
- 처음 놓는 자리: `pickSpawnPoint` — 배출구 범위와 그 주변 0.4를 피한 `±2.3` 안의 임의 x·z, 높이는 `1.5 + index * 0.9`(차례로 떨어져 쌓인다).
- 사라지는 인형(`isVanishing`)은 `dolls.vanishTime` 동안 크기가 0으로 줄어든 뒤 `onVanished(id)` 를 부른다.
- `isOutOfBounds`: `y < dolls.respawnBelowY` 이거나 x·z가 `floorHalf + 1` 을 넘는다. 매 프레임 확인해 해당 인형을 `pickSpawnPoint` 자리로 `respawn` 한다(속도 0으로).
- 색·분위기: 파스텔 분홍 기계(스펙 4장).

- [ ] **Step 1: 실패하는 테스트 쓰기** — `src/game/spawn.test.ts`

```ts
it('처음 자리는 기계 안이고 배출구를 피한다', () => {
  for (let i = 0; i < 200; i += 1) {
    const p = pickSpawnPoint(i % 15, layout, GAME_CONFIG, Math.random);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(2.3);
    expect(Math.abs(p.z)).toBeLessThanOrEqual(2.3);
    expect(p.x < layout.chuteMaxX + 0.4 && p.z > layout.chuteMinZ - 0.4).toBe(false);
  }
});
it('나중 인형일수록 높은 곳에서 떨어진다', () => {
  expect(pickSpawnPoint(3, layout, GAME_CONFIG, () => 0.5).y).toBeCloseTo(4.2);
});
it('기계 밖이나 바닥 아래로 나간 인형을 알아챈다 (Review Focus 5)', () => {
  expect(isOutOfBounds({ x: 0, y: -6, z: 0 }, GAME_CONFIG)).toBe(true);
  expect(isOutOfBounds({ x: 4.5, y: 1, z: 0 }, GAME_CONFIG)).toBe(true);
  expect(isOutOfBounds({ x: 2.9, y: 0.5, z: -2.9 }, GAME_CONFIG)).toBe(false);
});
```

- [ ] **Step 2: 실패 확인** — `npm test -- spawn` → FAIL
- [ ] **Step 3: `spawn.ts` 구현 후 통과 확인**
- [ ] **Step 4: 장면 컴포넌트 구현** — `App` 은 임시로 `createInstances(DOLL_KINDS, GAME_CONFIG.dolls.perKind, new Set())` 를 그대로 넘긴다.
- [ ] **Step 5: 눈으로 확인** — `npm run dev` 를 띄우고 브라우저를 390×844로 열어 확인한다: 인형 15개가 떨어져 쌓인 뒤 멈춘다, 5종이 색·모양·크기로 구분된다, 배출구 안에는 인형이 없다, 기계 전체가 화면 위쪽에 들어오고 아래쪽에 조작부 자리가 남는다, 콘솔 오류가 없다. 1280×800에서도 가운데 세로 틀로 같은 화면이 뜬다.
- [ ] **Step 6: 통과 확인** — `npm run verify`
- [ ] **Step 7: 커밋** — `git commit -m "feat: 3D 기계와 인형 물리 추가"`

---

### Task 7: 집게, 조작, 게임 한 판 연결

**Files:**
- Create: `src/scene/Claw.tsx`, `src/scene/useClawLoop.ts`, `src/input/useMoveInput.ts`, `src/session/useGameSession.ts`, `src/ui/Joystick.tsx`, `src/ui/DropButton.tsx`
- Modify: `src/App.tsx`, `src/scene/GameCanvas.tsx`

**Interfaces:**
- Consumes: Task 2~6의 전부
- Produces:

```ts
// useMoveInput.ts
export interface MoveInput { readMove(): Vec2; takeDropRequest(): boolean; setStick(move: Vec2): void; requestDrop(): void }
export function useMoveInput(): MoveInput; // 방향키·스페이스 수신 포함, 값은 ref 로만 보관(리렌더 없음)

// useGameSession.ts
export interface GameSession {
  instances: readonly DollInstance[]; vanishingIds: ReadonlySet<string>; wonKindIds: ReadonlySet<string>;
  celebration: { kind: DollKind; isComplete: boolean } | null;
  phase: ClawPhase;
  reportChuteArrival(dollId: string): string[] | null; // 획득이면 사라질 인형 id 목록, 아니면 null
  handleVanished(id: string): void; setPhase(phase: ClawPhase): void; closeCelebration(): void;
}
export function useGameSession(storage: KeyValueStorage): GameSession;

// useClawLoop.ts
export interface ClawView { x: number; z: number; shownX: number; shownZ: number; hubY: number; closeAmount: number; isHolding: boolean; phase: ClawPhase }
export function useClawLoop(args: { input: MoveInput; session: GameSession; dolls: Map<string, DollHandle>; kindOf: (dollId: string) => DollKind; onEvent: (event: ClawEvent) => void }): RefObject<ClawView>;

// Claw.tsx
export interface ClawProps { view: RefObject<ClawView>; maxCoreRadius: number; showGuide: boolean }
```

정해 둔 것:
- `useClawLoop` 는 물리 단계 직전에 매 프레임 실행한다: ① `dolls` 에서 사라지는 중이 아닌 인형의 위치를 읽어 `DollSnapshot[]` 을 만든다 ② `stepClaw` ③ 이벤트를 `onEvent` 로 전달, 단계가 바뀌면 `session.setPhase` ④ 들고 있으면 그 인형에 `setVelocityToward({ x: shownX, y: getHoldHeight, z: shownZ }, grab.holdFollow)`(이 호출은 인형의 회전도 함께 줄여서 매달린 채 팽이처럼 돌지 않게 한다) ⑤ 들려 있지 않은 인형 중 `isInsideChute` 인 것마다 `session.reportChuteArrival` → 목록이 돌아오면 `markWin` 과 `forgetDolls` 적용 ⑥ `isOutOfBounds` 인형 `respawn`.
- 줄 흔들림은 보이는 위치에만 적용한다: `shownX/shownZ` 가 실제 `x/z` 를 스프링(`swayStiffness`, `swayDamping`)으로 따라간다. 판정에는 실제 위치를 쓴다.
- 집게 생김새: 몸통 + 손가락 3개 + 줄 + 위쪽 레일. 손가락 길이와 벌어진 폭은 `maxCoreRadius` 에 맞춰 가장 큰 인형을 감쌀 수 있게 한다. 오므린 각도는 인형을 들고 있을 때 덜 오므린다. 흔들릴 때 실제 위치와 보이는 위치 차이만큼 살짝 기운다.
- 위치 안내선(바닥 고리 + 세로 선)은 `phase === 'idle'` 일 때만 보인다.
- `useGameSession`: 시작 시 `loadWonKinds` 로 기록을 읽어 `createInstances` 한다. `reportChuteArrival` 은 `applyWin` 을 부르고, 획득이면 `vanishingIds` 에 추가·`saveWonKinds`·`celebration` 설정 후 `removedIds` 를 돌려준다. `handleVanished` 가 실제로 목록에서 지운다.
- 조이스틱: 왼쪽 아래 지름 132px 원, 손잡이 58px, 손잡이 이동 한계 36px. 포인터 캡처를 쓰고 `pointerup`·`pointercancel` 에서 입력을 0으로 되돌린다. 위로 밀면 화면 안쪽(-z), 아래로 밀면 앞쪽(+z).
- 내리기 버튼: 오른쪽 아래 지름 104px 원, 글자 `내리기`, `pointerdown` 에 반응, `session.phase !== 'idle'` 이면 비활성 모양. 둘 다 안전 영역(`env(safe-area-inset-bottom)`)을 피한다.
- 키보드: 방향키 이동, 스페이스 내리기(스크롤 방지).

- [ ] **Step 1: 구현** — 위 순서대로 `useMoveInput` → `useGameSession` → `useClawLoop` → `Claw` → UI 두 개 → `App` 연결.
- [ ] **Step 2: 한 판 확인(390×844 브라우저, 키보드)** — 다음을 모두 본다.
  1. 집게가 배출구 위에서 시작하고 방향키로 움직이며 벽 근처에서 멈춘다. 멈출 때 살짝 흔들린다.
  2. 인형 위에서 스페이스 → 내려가 멈춤 → 오므림 → 들어 올림 → 배출구 위로 이동 → 놓음. 그동안 버튼이 비활성이고 방향키가 듣지 않는다.
  3. 인형이 배출구에 떨어지면 기계에 남은 같은 종류가 모두 뿅 사라지고, 그 위에 있던 인형이 내려앉는다.
  4. 새로고침하면 뽑은 종류가 기계에 나오지 않는다.
  5. 허공에 내리면 빈손으로 돌아온다. 일부러 빗겨 잡기를 반복해 미끄러짐과, 3번 실패 뒤 보정을 본다.
  6. 가장 큰 종류(개구리)와 가장 작은 종류(병아리)를 각각 뽑아 본다: 집게가 인형 크기에 맞는 높이에서 멈추고, 배출구에 걸리지 않고 들어간다.
  7. 5종을 다 뽑으면 기계가 비고 콘솔 오류가 없다.
- [ ] **Step 3: 터치 확인** — 브라우저의 터치 에뮬레이션으로 조이스틱을 끌고 내리기 버튼을 눌러 같은 흐름이 되는지 본다. 조이스틱을 누른 채 다른 손가락으로 버튼을 눌러도 동작한다.
- [ ] **Step 4: 통과 확인** — `npm run verify`
- [ ] **Step 5: 커밋** — `git commit -m "feat: 집게 조작과 뽑기 한 판 연결"`

---

### Task 8: 축하 연출, 진행 표시, 소리

**Files:**
- Create: `src/ui/Celebration.tsx`, `src/ui/Hud.tsx`, `src/ui/SoundToggle.tsx`, `src/audio/sfx.ts`, `src/audio/sfx.test.ts`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `GameSession`, `ClawEvent`, `DollModel`, `consumeResetFlag`
- Produces:

```ts
// sfx.ts
export type SfxName = 'drop' | 'grab' | 'miss' | 'slip' | 'win' | 'complete';
export function sfxForEvent(event: ClawEvent): SfxName | null; // dropStarted→drop, grabbed→grab, missed→miss, slipped→slip, 나머지 null
export interface Sfx { unlock(): void; play(name: SfxName): void; setMuted(muted: boolean): void }
export function createSfx(): Sfx; // Web Audio 합성. 지원하지 않으면 아무 일도 하지 않는 구현을 돌려준다
// Celebration.tsx
export interface CelebrationProps { kind: DollKind; isComplete: boolean; onClose: () => void }
// Hud.tsx
export interface HudProps { wonCount: number; totalCount: number }
// SoundToggle.tsx
export interface SoundToggleProps { isMuted: boolean; onToggle: () => void }
```

정해 둔 것:
- 축하 화면: 화면 전체를 덮고, 뽑은 인형(`DollModel`)이 크게 떠올라 천천히 돌며, 색종이가 터진다. 글자는 인형 표시 이름과 `뽑았다!` 뿐이다. 아무 곳이나 누르면 닫힌다. `isComplete` 면 색종이가 더 많고 오래가며 글자는 `전부 뽑았다!`. 닫으면 빈 기계가 남는다. 새 의존성 없이 만든다.
- 축하 화면이 떠 있는 동안 조이스틱·내리기·키보드 입력은 게임에 전달되지 않는다.
- HUD: 위쪽 가운데에 `2 / 5` 형태. 소리 버튼은 위쪽 오른편.
- 소리: 첫 `pointerdown`/`keydown` 에 `unlock()`(브라우저 자동 재생 제한). 획득 시 `win`, 5종 완료 시 `complete`. 배경 음악 없음. 음소거 상태는 저장하지 않는다.
- 진동: `navigator.vibrate` 가 있을 때만, 잡았을 때 짧게·획득 때 길게. 음소거와 무관.
- `main.tsx`: 렌더 전에 `consumeResetFlag(location.search, localStorage)` 를 부르고, 지웠으면 `history.replaceState` 로 주소에서 `reset` 을 뗀다(새로고침 때 다시 지워지지 않게). `localStorage` 접근 자체가 예외를 던지는 환경을 위해 접근을 try로 감싼 얇은 `KeyValueStorage` 를 만들어 넘긴다.

- [ ] **Step 1: 실패하는 테스트 쓰기** — `src/audio/sfx.test.ts`

```ts
it('집게 이벤트를 효과음 이름으로 바꾼다', () => {
  expect(sfxForEvent({ type: 'dropStarted' })).toBe('drop');
  expect(sfxForEvent({ type: 'grabbed', dollId: 'a' })).toBe('grab');
  expect(sfxForEvent({ type: 'missed' })).toBe('miss');
  expect(sfxForEvent({ type: 'slipped', dollId: 'a' })).toBe('slip');
  expect(sfxForEvent({ type: 'released', dollId: null })).toBeNull();
  expect(sfxForEvent({ type: 'tryEnded', won: true })).toBeNull();
});
it('Web Audio 가 없는 환경에서도 오류를 내지 않는다', () => {
  const sfx = createSfx(); // 테스트 환경에는 AudioContext 가 없다
  expect(() => { sfx.unlock(); sfx.play('win'); sfx.setMuted(true); }).not.toThrow();
});
```

- [ ] **Step 2: 실패 확인** — `npm test -- sfx` → FAIL
- [ ] **Step 3: 구현** — `sfx.ts` → UI 세 개 → `App`/`main.tsx` 연결.
- [ ] **Step 4: 확인(390×844)** — 한 종을 뽑아 축하 화면·소리·`1 / 5` 를 본다. 화면을 눌러 닫고 계속 플레이한다. 음소거하면 소리가 나지 않는다. `?reset` 을 붙여 열면 15개로 돌아오고 주소에서 `reset` 이 사라진다. 5종을 다 뽑아 큰 축하 화면과 `5 / 5` 를 본다.
- [ ] **Step 5: 통과 확인** — `npm run verify`
- [ ] **Step 6: 커밋** — `git commit -m "feat: 축하 연출과 진행 표시, 효과음 추가"`

---

### Task 9: 조정 패널, 실제 모델 넣는 길, 마무리

**Files:**
- Create: `src/ui/DebugPanel.tsx`, `src/config/runtimeTuning.ts`, `src/config/runtimeTuning.test.ts`, `docs/dolls.md`, `public/dolls/.gitkeep`
- Modify: `src/scene/DollModel.tsx`, `src/scene/useClawLoop.ts`, `src/App.tsx`
- Delete: `spike/`

**Interfaces:**
- Consumes: `GAME_CONFIG`, `GameConfig`, `DollKind`
- Produces:

```ts
// runtimeTuning.ts
export interface TuningOverrides { grip?: number; reachMargin?: number; pityAfterFails?: number }
export function applyTuning(config: GameConfig, overrides: TuningOverrides): GameConfig; // 원본을 바꾸지 않는다
export function isDebugMode(search: string): boolean; // ?debug 가 있을 때만 true
// DebugPanel.tsx
export interface DebugPanelProps { overrides: TuningOverrides; onChange: (next: TuningOverrides) => void; failStreak: number }
```

정해 둔 것:
- 조정 패널은 `isDebugMode(location.search)` 일 때만 그린다. 접힌 상태로 위쪽 왼편에 있고, 집게 힘(0~1, 0.05 단위)·닿는 여유(0.1~0.8)·보정까지 실패 횟수(1~6) 슬라이더와 현재 연속 실패 수를 보여 준다. 바꾼 값은 다음 시도부터 적용되고 새로고침하면 사라진다(확정 값은 `gameConfig.ts` 에 직접 적는다).
- `DollModel`: `kind.modelUrl` 이 있으면 drei의 `useGLTF` 로 읽어 인스턴스마다 복제해 그리고 `kind.scale` 을 적용한다. 읽는 동안과 실패했을 때는 그 종류의 임시 도형을 보여 준다(게임이 멈추지 않는다).
- `docs/dolls.md`(한국어): 준비물(`.glb`, 권장 삼각형 2만 개 이하·2MB 이하) → `public/dolls/<id>.glb` 에 넣기 → `dollCatalog.ts` 에서 `modelUrl`·`displayName`·`scale` 고치기 → 충돌 도형과 `coreRadius` 맞추는 법(실물 높이 12cm ↔ 20~25cm 비율을 `scale` 로 옮기는 기준 포함) → `?debug` 로 집게 힘 맞추기 → `?reset` 으로 초기화 → 선물 전 확인 목록.
- `spike/` 는 본 제작이 같은 손맛을 내는 것을 확인한 뒤 지운다. ESLint 제외 목록에서도 뺀다.

- [ ] **Step 1: 실패하는 테스트 쓰기** — `src/config/runtimeTuning.test.ts`

```ts
it('덮어쓴 값만 바뀌고 원본은 그대로다', () => {
  const next = applyTuning(GAME_CONFIG, { grip: 0.9 });
  expect(next.grab.grip).toBe(0.9);
  expect(next.grab.reachMargin).toBe(0.35);
  expect(GAME_CONFIG.grab.grip).toBe(0.6);
});
it('?debug 가 있을 때만 조정 모드다', () => {
  expect(isDebugMode('?debug')).toBe(true);
  expect(isDebugMode('?reset&debug=1')).toBe(true);
  expect(isDebugMode('')).toBe(false);
  expect(isDebugMode('?debugger')).toBe(false);
});
```

- [ ] **Step 2: 실패 확인 → 구현 → 통과 확인** — `npm test -- runtimeTuning`
- [ ] **Step 3: 조정 패널 연결과 확인** — `?debug` 없이 열면 패널이 없다. `?debug` 로 열어 집게 힘을 1로 올리면 빗겨 잡아도 잘 들리고, 0으로 내리면 보정 전까지 계속 놓친다.
- [ ] **Step 4: glb 경로 확인** — Khronos 공개 샘플(`Duck.glb`)을 `public/dolls/sample.glb` 로 임시로 받아 한 종류의 `modelUrl` 에 연결한다. 그 종류 3개가 모델로 보이고 집기·획득·축하 화면이 되는지, 없는 파일 경로를 넣었을 때 임시 도형으로 대신 뜨는지 확인한다. 확인 뒤 샘플 파일과 설정을 되돌린다.
- [ ] **Step 5: `docs/dolls.md` 작성, `spike/` 삭제**
- [ ] **Step 6: 마지막 통과 확인** — `npm run verify`, `npm run build`, `npx vite preview` 로 빌드 결과물에서 한 판(390×844)을 끝까지 돌린다. 콘솔 오류가 없어야 한다.
- [ ] **Step 7: 커밋** — `git commit -m "feat: 조정 패널과 인형 모델 교체 경로 추가, 시제품 삭제"`

---

## 이 계획 뒤에 남는 일 (범위 밖)

- 의뢰인이 실제 폰에서 손맛과 끊김을 확인한다.
- 실제 인형 5종이 정해지면 `.glb` 를 만들어 `docs/dolls.md` 대로 넣고 수치를 다시 맞춘다.
- 정적 호스팅에 올릴 곳과 주소를 정한다.
