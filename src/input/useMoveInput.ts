import { useEffect, useMemo, useRef } from 'react';
import { clampLength } from '../game/math';
import type { Vec2 } from '../game/types';

/** 조이스틱·키보드 입력을 모아 두는 곳. 값은 ref 에만 두므로 입력이 바뀌어도 다시 그리지 않는다. */
export interface MoveInput {
  /** 조이스틱과 방향키를 합친 기울기. 길이는 1을 넘지 않는다. */
  readMove(): Vec2;
  /** 쌓인 내리기 요청을 꺼내고 비운다 */
  takeDropRequest(): boolean;
  setStick(move: Vec2): void;
  requestDrop(): void;
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

export interface MoveInputOptions {
  /** 축하 화면처럼 게임 위에 다른 화면이 떠 있는 동안 true. 그동안 들어온 입력은 게임에 전달하지 않는다. */
  isBlocked: boolean;
}

/**
 * 조이스틱 값과 방향키를 받는다. 창 전체의 키 입력을 듣고, 스페이스로 화면이 스크롤되지 않게 막는다.
 * 막히는 순간 눌려 있던 키·조이스틱·내리기 요청을 모두 비운다. 그래야 막힌 동안 손을 떼서 놓친 입력 때문에
 * 풀린 뒤 집게가 혼자 흘러가지 않는다. 풀린 뒤에도 계속 누르고 있는 키는 키 반복 입력으로 다시 잡힌다.
 */
export function useMoveInput({ isBlocked }: MoveInputOptions): MoveInput {
  const stick = useRef<Vec2>(CENTER);
  const pressedKeys = useRef(new Set<string>());
  const isDropRequested = useRef(false);
  const isBlockedRef = useRef(isBlocked);

  useEffect(() => {
    isBlockedRef.current = isBlocked;
    if (!isBlocked) return;

    stick.current = CENTER;
    pressedKeys.current.clear();
    isDropRequested.current = false;
  }, [isBlocked]);

  useEffect(() => {
    const keys = pressedKeys.current;
    const handleKeyDown = (event: KeyboardEvent): void => {
      // 막힌 동안에는 기본 동작도 막지 않는다. 축하 화면 버튼이 스페이스·엔터로 닫혀야 한다.
      if (isBlockedRef.current) return;
      if (event.code === DROP_KEY) {
        event.preventDefault();
        // 누르고 있어서 반복되는 입력으로는 다음 시도를 시작하지 않는다
        if (!event.repeat) isDropRequested.current = true;
        return;
      }
      if (Object.hasOwn(KEY_DIRECTIONS, event.code)) keys.add(event.code);
    };
    const handleKeyUp = (event: KeyboardEvent): void => {
      keys.delete(event.code);
    };
    // 키를 누른 채 다른 창으로 가면 keyup 이 오지 않아 집게가 계속 움직인다
    const releaseAllKeys = (): void => keys.clear();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAllKeys);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAllKeys);
    };
  }, []);

  return useMemo(
    (): MoveInput => ({
      readMove: (): Vec2 => clampLength(addKeyDirections(stick.current, pressedKeys.current), MAX_TILT),
      takeDropRequest: (): boolean => {
        const wasRequested = isDropRequested.current;
        isDropRequested.current = false;
        return wasRequested;
      },
      setStick: (move: Vec2): void => {
        if (isBlockedRef.current) return;
        stick.current = move;
      },
      requestDrop: (): void => {
        if (isBlockedRef.current) return;
        isDropRequested.current = true;
      },
    }),
    [],
  );
}

function addKeyDirections(stick: Vec2, pressedKeys: ReadonlySet<string>): Vec2 {
  let { x, z } = stick;
  for (const code of pressedKeys) {
    x += KEY_DIRECTIONS[code].x;
    z += KEY_DIRECTIONS[code].z;
  }
  return { x, z };
}
