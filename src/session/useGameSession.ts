import { useCallback, useRef, useState } from 'react';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import { applyWin, createInstances, type DollInstance } from '../game/collection';
import { loadUnseenKinds, loadWonKinds, saveUnseenKinds, saveWonKinds, type KeyValueStorage } from '../game/progressStore';
import type { ClawPhase } from '../game/types';
import {
  celebrationForWin,
  currentCelebration,
  dequeueCelebration,
  enqueueCelebration,
  restoreCelebrations,
  unseenKindIds,
  type CelebrationQueue,
  type WinCelebration,
} from './celebrationQueue';

/** 한 판의 React 상태: 기계 안 인형, 사라지는 중인 인형, 뽑은 종류, 축하할 인형, 집게 단계 */
export interface GameSession {
  instances: readonly DollInstance[];
  vanishingIds: ReadonlySet<string>;
  wonKindIds: ReadonlySet<string>;
  /**
   * 지금 보여 줄 축하. 축하 화면이 떠 있는 동안 다른 종류를 또 뽑으면 뒤에 줄 서고, 닫을 때마다 다음 것이 나온다.
   * 닫지 않은 축하는 저장해 두어, 새로고침하거나 다시 열어도 그 축하부터 다시 보여 준다.
   */
  celebration: WinCelebration | null;
  phase: ClawPhase;
  /** 획득이면 사라질 인형 id 목록, 아니면 null */
  reportChuteArrival(dollId: string): string[] | null;
  handleVanished(id: string): void;
  setPhase(phase: ClawPhase): void;
  /** 지금 축하를 닫고 줄 선 다음 축하로 넘어간다 */
  closeCelebration(): void;
}

/** 기계 안 인형과 뽑은 기록. 사라지는 중인 인형은 다 사라질 때까지 instances 에 남아 그려진다. */
interface Collection {
  instances: readonly DollInstance[];
  vanishingIds: ReadonlySet<string>;
  wonKindIds: ReadonlySet<string>;
}

/**
 * 저장된 기록을 읽어 뽑은 종류를 뺀 인형으로 시작하고, 닫지 않은 축하가 있으면 그것부터 보여 준다.
 * 기록이 바뀌는 일은 모두 이 훅 안에서 일어난다.
 */
export function useGameSession(storage: KeyValueStorage): GameSession {
  const [collection, setCollection] = useState((): Collection => loadCollection(storage));
  // 물리 단계 안에서 같은 프레임에 여러 번 불려도 바로 앞 결과를 보도록 최신 값을 ref 에도 둔다.
  // 같은 종류 둘이 한꺼번에 배출구에 들어가도 획득은 한 번만 처리된다.
  const latest = useRef(collection);
  const [celebrations, setCelebrations] = useState((): CelebrationQueue => loadCelebrations(storage, collection.wonKindIds));
  const latestCelebrations = useRef(celebrations);
  const [phase, setPhase] = useState<ClawPhase>('idle');

  const commit = useCallback((next: Collection): void => {
    latest.current = next;
    setCollection(next);
  }, []);

  // 축하 줄이 바뀔 때마다 닫지 않은 축하를 그 자리에서 저장한다. 다시 그려진 뒤(effect)에 저장하면
  // 뽑은 기록만 저장되고 축하 기록은 남기 전에 페이지가 닫혀, 뽑은 인형 이름을 다시 볼 수 없게 될 수 있다.
  const commitCelebrations = useCallback(
    (next: CelebrationQueue): void => {
      latestCelebrations.current = next;
      setCelebrations(next);
      saveUnseenKinds(storage, unseenKindIds(next));
    },
    [storage],
  );

  const reportChuteArrival = useCallback(
    (dollId: string): string[] | null => {
      const current = latest.current;
      const result = applyWin(current.instances, current.wonKindIds, dollId, DOLL_KINDS.length);
      if (result === null) return null;

      commit({
        instances: current.instances,
        vanishingIds: new Set([...current.vanishingIds, ...result.removedIds]),
        wonKindIds: result.wonKindIds,
      });
      saveWonKinds(storage, result.wonKindIds);
      commitCelebrations(enqueueCelebration(latestCelebrations.current, celebrationForWin(result, DOLL_KINDS)));
      return result.removedIds;
    },
    [commit, commitCelebrations, storage],
  );

  const handleVanished = useCallback(
    (id: string): void => {
      const current = latest.current;
      if (!current.vanishingIds.has(id)) return;

      const vanishingIds = new Set(current.vanishingIds);
      vanishingIds.delete(id);
      commit({
        instances: current.instances.filter((instance): boolean => instance.id !== id),
        vanishingIds,
        wonKindIds: current.wonKindIds,
      });
    },
    [commit],
  );

  const closeCelebration = useCallback(
    (): void => commitCelebrations(dequeueCelebration(latestCelebrations.current)),
    [commitCelebrations],
  );

  return {
    ...collection,
    celebration: currentCelebration(celebrations),
    phase,
    reportChuteArrival,
    handleVanished,
    setPhase,
    closeCelebration,
  };
}

const KIND_IDS = DOLL_KINDS.map((kind): string => kind.id);

/** 뽑은 기록에 있고 아직 닫지 않은 축하를 저장된 순서대로 다시 줄 세운다 */
function loadCelebrations(storage: KeyValueStorage, wonKindIds: ReadonlySet<string>): CelebrationQueue {
  return restoreCelebrations(loadUnseenKinds(storage, wonKindIds), wonKindIds, DOLL_KINDS);
}

function loadCollection(storage: KeyValueStorage): Collection {
  const wonKindIds = loadWonKinds(storage, KIND_IDS);
  return {
    instances: createInstances(DOLL_KINDS, GAME_CONFIG.dolls.perKind, wonKindIds),
    vanishingIds: new Set(),
    wonKindIds,
  };
}
