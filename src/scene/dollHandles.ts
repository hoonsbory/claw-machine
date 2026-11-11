import { createContext, useContext } from 'react';
import type { DollHandle } from './Doll';

/**
 * 인형 id → 손잡이 지도. GameCanvas 가 캔버스가 살아 있는 동안 같은 Map 하나를 Physics 안에 내려 준다.
 * 인형이 등록되거나 빠질 때는 Map 안만 바뀌므로 이것을 읽는 쪽은 다시 그려지지 않는다.
 */
export const DollHandlesContext = createContext<Map<string, DollHandle> | null>(null);

/** Physics 안(GameCanvas 의 children)에서 인형 손잡이 지도를 꺼낸다. 매 프레임 읽어도 된다. */
export function useDollHandles(): Map<string, DollHandle> {
  const handles = useContext(DollHandlesContext);
  if (handles === null) throw new Error('useDollHandles 는 GameCanvas 의 children 안에서만 쓸 수 있다');
  return handles;
}
