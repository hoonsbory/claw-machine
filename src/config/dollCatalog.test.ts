import { describe, expect, it } from 'vitest';
import { getCabinetLayout } from '../game/dollGeometry';
import { DOLL_KINDS } from './dollCatalog';
import { GAME_CONFIG } from './gameConfig';

/*
 * 실제 카탈로그(dollCatalog.ts)와 설정(gameConfig.ts)이 어떤 인형을 넣든 지켜야 할 조건.
 * 이 파일만 실제 값을 읽는다. 다른 테스트는 고정 자료(src/game/testFixtures.ts)로 계산 규칙만 확인하므로
 * 인형 종류·scale·집게 힘을 바꿔도 깨지지 않는다. 여기가 실패하면 메시지대로 카탈로그나 설정을 고친다.
 */
describe('실제 인형 카탈로그와 설정', () => {
  it('인형 종류가 하나 이상 있다', () => {
    expect(DOLL_KINDS.length, 'dollCatalog.ts 의 DOLL_KINDS 가 비어 있다. 인형 종류를 하나 이상 적는다.').toBeGreaterThan(0);
  });

  it('종류 id 가 서로 겹치지 않는다', () => {
    const ids = DOLL_KINDS.map((kind): string => kind.id);
    const duplicatedIds = ids.filter((id, index): boolean => ids.indexOf(id) !== index);
    expect(
      duplicatedIds,
      `dollCatalog.ts 에서 같은 id 를 두 종류 이상이 쓴다: ${duplicatedIds.join(', ')}. 종류마다 다른 id 를 적는다.`,
    ).toEqual([]);
  });

  it('모든 종류의 scale 이 0 보다 크다', () => {
    for (const kind of DOLL_KINDS) {
      expect(kind.scale, `dollCatalog.ts 의 '${kind.id}' scale 이 ${kind.scale} 이다. 0 보다 큰 값(실물 높이 cm ÷ 17)을 적는다.`).toBeGreaterThan(0);
    }
  });

  it('모든 종류의 첫 충돌 도형은 원점에 놓인, 반지름이 coreRadius 와 같은 몸통 공이다', () => {
    for (const kind of DOLL_KINDS) {
      const body = kind.colliders.at(0);
      const isBodyBall =
        body !== undefined &&
        body.shape === 'ball' &&
        body.radius === kind.coreRadius &&
        body.offset.every((value): boolean => value === 0);
      expect(
        isBodyBall,
        `dollCatalog.ts 의 '${kind.id}' colliders 첫 줄은 { shape: 'ball', radius: ${kind.coreRadius}(coreRadius 와 같은 값), offset: [0, 0, 0] } 인 몸통 공이어야 한다. 지금 첫 줄: ${JSON.stringify(body)}`,
      ).toBe(true);
    }
  });

  it('배출구 가운데가 집게가 갈 수 있는 범위 안에 있다', () => {
    const { chuteSize, home } = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
    const { moveLimit } = GAME_CONFIG.claw;
    const isReachable = Math.abs(home.x) <= moveLimit && Math.abs(home.z) <= moveLimit;
    expect(
      isReachable,
      `배출구(한 변 ${chuteSize.toFixed(2)}) 가운데 (${home.x.toFixed(2)}, ${home.z.toFixed(2)}) 가 집게 이동 한계 ±${moveLimit} 밖이다. 인형 크기로는 생기지 않는 상황이므로 gameConfig.ts 에서 claw.moveLimit 이나 cabinet.floorHalf 를 바꿨는지 확인하고 되돌린다.`,
    ).toBe(true);
  });

  it('종류당 인형 수가 1 이상이다', () => {
    expect(
      GAME_CONFIG.dolls.perKind,
      `gameConfig.ts 의 dolls.perKind 가 ${GAME_CONFIG.dolls.perKind} 이다. 종류마다 기계에 넣을 인형 수를 1 이상으로 적는다.`,
    ).toBeGreaterThanOrEqual(1);
  });
});
