import { clampLength } from '../game/math';
import type { Vec2 } from '../game/types';

/** 조이스틱·키보드 입력을 모아 두는 곳. 값은 이 객체 안에만 두므로 입력이 바뀌어도 화면을 다시 그리지 않는다. */
export interface MoveInput {
  /** 조이스틱과 방향키를 합친 기울기. 길이는 1을 넘지 않는다. */
  readMove(): Vec2;
  /** 쌓인 내리기 요청을 꺼내고 비운다 */
  takeDropRequest(): boolean;
  setStick(move: Vec2): void;
  requestDrop(): void;
}

/**
 * 입력 상태와, 창의 키 이벤트를 받는 쪽. useMoveInput 이 브라우저 이벤트를 여기에 넘긴다.
 * 축하 화면처럼 게임 위에 다른 화면이 떠 있는 동안에는 막는다. 막히는 순간 조이스틱·눌린 키·내리기 요청을 모두 비워서,
 * 막힌 동안 손을 떼 놓친 입력 때문에 풀린 뒤 집게가 혼자 흘러가지 않게 한다.
 * 풀린 뒤에도 계속 누르고 있는 키는 키 반복 입력으로 다시 잡힌다.
 */
export interface MoveInputState extends MoveInput {
  /** 키가 눌렸다. 브라우저 기본 동작(스페이스의 스크롤)을 막아야 하면 true. 막힌 동안에는 아무 일도 하지 않고 false 다. */
  keyDown(code: string, isRepeat: boolean): boolean;
  /** 막힌 동안에도 처리한다 */
  keyUp(code: string): void;
  /** 키를 누른 채 다른 창으로 가면 keyup 이 오지 않아 집게가 계속 움직인다 */
  releaseAllKeys(): void;
  /** 막는 동안에는 조이스틱·내리기·키 누름을 무시한다 */
  setBlocked(shouldBlock: boolean): void;
}

/** 방향키 하나가 더하는 기울기. 위는 화면 안쪽(-z), 아래는 앞쪽(+z)이다. */
const KEY_DIRECTIONS: Readonly<Record<string, Vec2>> = {
  ArrowLeft: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  ArrowUp: { x: 0, z: -1 },
  ArrowDown: { x: 0, z: 1 },
};
const DROP_KEY = 'Space';
const MAX_TILT = 1;
const CENTER: Vec2 = { x: 0, z: 0 };

export function createMoveInputState(): MoveInputState {
  let stick = CENTER;
  const pressedKeys = new Set<string>();
  let isDropRequested = false;
  let isBlocked = false;

  return {
    readMove: (): Vec2 => clampLength(addKeyDirections(stick, pressedKeys), MAX_TILT),
    takeDropRequest(): boolean {
      const wasRequested = isDropRequested;
      isDropRequested = false;
      return wasRequested;
    },
    setStick(move: Vec2): void {
      if (isBlocked) return;
      stick = move;
    },
    requestDrop(): void {
      if (isBlocked) return;
      isDropRequested = true;
    },
    keyDown(code: string, isRepeat: boolean): boolean {
      // 막힌 동안에는 기본 동작도 막지 않는다. 축하 화면 버튼이 스페이스·엔터로 닫혀야 한다.
      if (isBlocked) return false;
      if (code === DROP_KEY) {
        // 누르고 있어서 반복되는 입력으로는 다음 시도를 시작하지 않는다
        if (!isRepeat) isDropRequested = true;
        return true;
      }
      if (Object.hasOwn(KEY_DIRECTIONS, code)) pressedKeys.add(code);
      return false;
    },
    keyUp(code: string): void {
      pressedKeys.delete(code);
    },
    releaseAllKeys(): void {
      pressedKeys.clear();
    },
    setBlocked(shouldBlock: boolean): void {
      isBlocked = shouldBlock;
      if (!shouldBlock) return;

      stick = CENTER;
      pressedKeys.clear();
      isDropRequested = false;
    },
  };
}

function addKeyDirections(stick: Vec2, pressedKeys: ReadonlySet<string>): Vec2 {
  let { x, z } = stick;
  for (const code of pressedKeys) {
    x += KEY_DIRECTIONS[code].x;
    z += KEY_DIRECTIONS[code].z;
  }
  return { x, z };
}
