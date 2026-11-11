import type { GameConfig } from './gameConfig';

/** 조정 패널(?debug)에서 잠깐 바꿔 보는 집기 수치. 저장하지 않으며, 확정한 값은 gameConfig.ts 에 직접 적는다. */
export interface TuningOverrides {
  grip?: number;
  reachMargin?: number;
  pityAfterFails?: number;
}

/** 조정 모드를 켜는 주소 쿼리 매개변수 이름 */
const DEBUG_PARAM = 'debug';

/** 덮어쓴 값만 바꾼 새 설정을 돌려준다. 원본은 바꾸지 않는다. */
export function applyTuning(config: GameConfig, overrides: TuningOverrides): GameConfig {
  return {
    ...config,
    grab: {
      ...config.grab,
      grip: overrides.grip ?? config.grab.grip,
      reachMargin: overrides.reachMargin ?? config.grab.reachMargin,
      pityAfterFails: overrides.pityAfterFails ?? config.grab.pityAfterFails,
    },
  };
}

/** 주소 쿼리에 debug 매개변수가 있을 때만(`?debug`, `?reset&debug=1`) 조정 모드다. 이름이 정확히 같아야 한다. */
export function isDebugMode(search: string): boolean {
  return new URLSearchParams(search).has(DEBUG_PARAM);
}
