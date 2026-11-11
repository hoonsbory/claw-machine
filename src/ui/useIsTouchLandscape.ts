import { useSyncExternalStore } from 'react';

/** 손가락이 주 입력인 기기(폰·태블릿)를 가로로 눕혔을 때. 마우스·터치패드가 주 입력인 노트북은 해당하지 않는다. */
const TOUCH_LANDSCAPE_QUERY = '(pointer: coarse) and (orientation: landscape)';

/** 터치 기기가 가로로 눕혀져 있는지. 기기를 돌리면 바로 바뀐다. */
export function useIsTouchLandscape(): boolean {
  return useSyncExternalStore(subscribe, isTouchLandscape);
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(TOUCH_LANDSCAPE_QUERY);
  query.addEventListener('change', onChange);
  return (): void => query.removeEventListener('change', onChange);
}

function isTouchLandscape(): boolean {
  return window.matchMedia(TOUCH_LANDSCAPE_QUERY).matches;
}
