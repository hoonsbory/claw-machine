import { css, cx } from '@emotion/css';
import type { ReactElement } from 'react';
import { DecoImage } from '../DecoImage';
import { getBobClass, getPoseClass } from '../decoMotion';

/** 구름 뒤(구름이 아래쪽을 가린다) 또는 맨 앞(구름·언덕 위) */
export type CharacterLayer = 'behindClouds' | 'front';

export interface BackdropCharactersProps {
  layer: CharacterLayer;
}

/**
 * 게임 화면 바탕의 캐릭터 그림(public/deco/). 3D 캔버스 뒤에 있어서 기계 옆에 붙여 두면 기계가 몸 일부를 가려,
 * 기계 뒤에서 고개를 내민 것처럼 보인다. 기계 옆 좁은 띠, 구름 위·뒤, 아래 몸통 옆 언덕에 둔다.
 * 유리 너머(놀이 공간)와 조작부(조이스틱·내리기 버튼·남은 기회 판)에는 겹치지 않는다.
 */
export function BackdropCharacters({ layer }: BackdropCharactersProps): ReactElement {
  return (
    <>
      {CHARACTER_LOOKS.filter((look) => look.layer === layer).map((look) => (
        <DecoImage key={look.key} file={look.file} className={look.className} />
      ))}
    </>
  );
}

/**
 * 가로 자리.
 * - frameEdge: 틀 가장자리와 그림 바깥쪽 가장자리 사이(px, 음수면 틀 밖으로 조금 나간다)
 * - cabinetSide: 그림 안쪽 가장자리가 기계 아래 몸통 옆면 뒤로 들어가 숨는 폭(px)
 */
type HorizontalPlace = { from: 'frameEdge'; gap: number } | { from: 'cabinetSide'; tuck: number };

/** 캐릭터 하나: 그림 파일, 층, 틀의 어느 쪽인지, 가로 자리, 위에서의 높이(틀 높이 %), 폭(px), 기울기(도), 좌우 뒤집기 */
interface CharacterSpot {
  file: string;
  layer: CharacterLayer;
  side: 'left' | 'right';
  x: HorizontalPlace;
  top: number;
  width: number;
  tilt: number;
  isFlipped?: boolean;
}

/** 그림 하나를 넣거나 빼려면 이 목록의 한 줄만 고친다 */
const CHARACTERS: readonly CharacterSpot[] = [
  { file: 'momonga.png', layer: 'front', side: 'left', x: { from: 'frameEdge', gap: -10 }, top: 1.5, width: 72, tilt: -8 },
  { file: 'rakko.png', layer: 'behindClouds', side: 'right', x: { from: 'frameEdge', gap: -4 }, top: 21, width: 54, tilt: 6 },
  { file: 'shisa.png', layer: 'behindClouds', side: 'left', x: { from: 'frameEdge', gap: -4 }, top: 43, width: 56, tilt: -6 },
  { file: 'chiikawa.png', layer: 'front', side: 'left', x: { from: 'cabinetSide', tuck: 24 }, top: 60, width: 84, tilt: 0 },
  { file: 'hachiware.png', layer: 'front', side: 'right', x: { from: 'cabinetSide', tuck: 24 }, top: 56, width: 84, tilt: 0 },
  { file: 'usagi.png', layer: 'front', side: 'right', x: { from: 'cabinetSide', tuck: 8 }, top: 68, width: 64, tilt: 0 },
];

/**
 * 기계 아래 몸통의 절반 폭. 카메라가 기계 폭을 화면 폭에 맞추되 넓은 화면에서는 세로 시야를 지키므로,
 * 좁은 화면에서는 틀 폭의, 넓은 화면에서는 틀 높이의 일정 비율이다(390×844 와 375×667 에서 잰 값).
 * 바탕(SkyBackdrop)이 크기 질의 컨테이너라 cqw·cqh 가 틀 폭·높이의 1% 다.
 */
const CABINET_HALF_WIDTH = 'min(38.5cqw, 17.8cqh)';
/** cqw·cqh 를 모르는 브라우저(iOS 15 이하)가 대신 쓰는 값. 폰처럼 좁은 화면의 비율만 맞춘다. */
const CABINET_HALF_WIDTH_FALLBACK = '38.5%';
/** 그림마다 둥실거림을 이만큼(초) 엇갈리게 시작한다 */
const BOB_STAGGER = -0.7;

function getHorizontalStyle(side: CharacterSpot['side'], x: HorizontalPlace): string {
  if (x.from === 'frameEdge') return `${side}: ${x.gap}px;`;
  // 왼쪽 그림은 오른쪽 가장자리를, 오른쪽 그림은 왼쪽 가장자리를 기계 옆면에서 tuck 만큼 안쪽에 둔다
  const innerEdge = side === 'left' ? 'right' : 'left';
  // 모르는 단위가 든 선언은 통째로 버려지므로, 앞줄의 % 값이 그 브라우저의 자리로 남는다
  return `
    ${innerEdge}: calc(50% + ${CABINET_HALF_WIDTH_FALLBACK} - ${x.tuck}px);
    ${innerEdge}: calc(50cqw + ${CABINET_HALF_WIDTH} - ${x.tuck}px);
  `;
}

interface CharacterLook {
  key: string;
  file: string;
  layer: CharacterLayer;
  className: string;
}

const CHARACTER_LOOKS = CHARACTERS.map(
  ({ file, layer, side, x, top, width, tilt, isFlipped = false }, index): CharacterLook => ({
    key: `${index}-${file}`,
    file,
    layer,
    className: cx(
      css`
        top: ${top}%;
        ${getHorizontalStyle(side, x)}
        width: ${width}px;
      `,
      getPoseClass(tilt, isFlipped),
      getBobClass(index * BOB_STAGGER),
    ),
  }),
);
