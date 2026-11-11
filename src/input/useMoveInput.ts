import { useEffect, useState } from 'react';
import { createMoveInputState, type MoveInput } from './moveInputState';

export type { MoveInput } from './moveInputState';

export interface MoveInputOptions {
  /** 축하 화면처럼 게임 위에 다른 화면이 떠 있는 동안 true. 그동안 들어온 입력은 게임에 전달하지 않는다(moveInputState.ts). */
  isBlocked: boolean;
}

/** 조이스틱 값과 방향키를 받는다. 창 전체의 키 입력을 입력 상태에 넘기고, 스페이스로 화면이 스크롤되지 않게 막는다. */
export function useMoveInput({ isBlocked }: MoveInputOptions): MoveInput {
  const [input] = useState(createMoveInputState);

  useEffect(() => {
    input.setBlocked(isBlocked);
  }, [input, isBlocked]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (input.keyDown(event.code, event.repeat)) event.preventDefault();
    };
    const handleKeyUp = (event: KeyboardEvent): void => input.keyUp(event.code);
    const releaseAllKeys = (): void => input.releaseAllKeys();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAllKeys);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAllKeys);
    };
  }, [input]);

  return input;
}
