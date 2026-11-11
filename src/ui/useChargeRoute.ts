import { useSyncExternalStore } from 'react';
import { isChargeRoute, removeHash } from './chargeRoute';

/** 지금 주소가 충전 페이지(`#charge`)인지. 주소 해시가 바뀌면(주소창에서 고치거나, 뒤로 가기) 바로 바뀐다. */
export function useIsChargeRoute(): boolean {
  return useSyncExternalStore(subscribe, readIsChargeRoute);
}

/**
 * 충전 페이지에서 게임으로 돌아간다. 주소에서 해시를 떼어(끝에 `#` 도 남기지 않는다) 방문 기록에 더하므로,
 * 브라우저 뒤로 가기를 누르면 다시 충전 페이지가 열린다. 새로고침 없이 게임 화면을 새로 그린다.
 */
export function leaveChargeRoute(): void {
  const oldURL = window.location.href;
  const newURL = removeHash(oldURL);
  window.history.pushState(window.history.state, '', newURL);
  // pushState 는 hashchange 를 일으키지 않아 해시가 바뀌었다고 직접 알린다
  window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL }));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return (): void => window.removeEventListener('hashchange', onChange);
}

function readIsChargeRoute(): boolean {
  return isChargeRoute(window.location.hash);
}
