import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import type { KeyValueStorage } from '../game/progressStore';
import { addTries, loadTries, spendTry, TRIES_KEY } from '../game/triesStore';

/** 남은 기회와 그것을 바꾸는 일. 바꾼 값은 그 자리에서 저장한다. */
export interface TriesCounter {
  /** 화면에 보여 줄 남은 기회 */
  tries: number;
  /** 다시 그려지기 전에도 바로 앞에 바꾼 값을 돌려준다(물리 단계 안에서 읽을 때) */
  readLatest(): number;
  /** 기회를 하나 쓴다 */
  spend(): void;
  /** 기회를 amount 만큼 충전한다 */
  add(amount: number): void;
}

/**
 * 저장소의 남은 기회를 읽어 들고 있다가, 쓰거나 충전할 때마다 저장소 값을 기준으로 바꿔 저장한다.
 * 다른 탭(충전 페이지)에서 바꾼 값도 보이도록, 저장소가 바뀌었다는 알림(storage)과 탭이 다시 보일 때(visibilitychange) 다시 읽는다.
 */
export function useTries(storage: KeyValueStorage): TriesCounter {
  const [tries, setTries] = useState((): number => loadTries(storage, LIMITS));
  const latest = useRef(tries);

  const commit = useCallback((next: number): void => {
    latest.current = next;
    setTries(next);
  }, []);

  useEffect(() => {
    const reload = (): void => commit(loadTries(storage, LIMITS));
    const reloadWhenTriesChange = (event: StorageEvent): void => {
      // key 가 null 이면 저장소 전체가 지워졌다
      const isTriesChange = event.key === TRIES_KEY || event.key === null;
      if (isTriesChange) reload();
    };
    const reloadWhenVisible = (): void => {
      if (!document.hidden) reload();
    };

    window.addEventListener('storage', reloadWhenTriesChange);
    document.addEventListener('visibilitychange', reloadWhenVisible);
    return (): void => {
      window.removeEventListener('storage', reloadWhenTriesChange);
      document.removeEventListener('visibilitychange', reloadWhenVisible);
    };
  }, [commit, storage]);

  const readLatest = useCallback((): number => latest.current, []);
  const spend = useCallback((): void => commit(spendTry(storage, LIMITS)), [commit, storage]);
  const add = useCallback((amount: number): void => commit(addTries(storage, LIMITS, amount)), [commit, storage]);

  return { tries, readLatest, spend, add };
}

const LIMITS = GAME_CONFIG.tries;
