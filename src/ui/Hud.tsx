import { css } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../theme/tokens';
import { StarDoodle } from './doodles';

export interface HudProps {
  wonCount: number;
  totalCount: number;
}

/**
 * 위쪽 왼편의 뽑은 종류 수(예: 2 / 5). 크림색 알약에 갈색 테두리와 작은 별을 붙였다.
 * 위쪽 가운데는 기계 간판 자리라 왼편 구석에 둔다. 화면을 누르는 데 방해되지 않도록 입력을 받지 않는다.
 */
export function Hud({ wonCount, totalCount }: HudProps): ReactElement {
  return (
    <div className={badge} role="status">
      <StarDoodle className={star} />
      {wonCount} / {totalCount}
    </div>
  );
}

/** 390×844 에서 기계 뒷벽 윗변(y≈37)보다 위, 간판 왼편에 들어가는 자리와 크기 */
const EDGE_TOP = 6;
const EDGE_LEFT = 10;
const HEIGHT = 30;
const PADDING_LEFT = 7;
const PADDING_RIGHT = 12;
const STAR_SIZE = 17;
const STAR_GAP = 4;
const FONT_SIZE = 17;

const { color, font, line, radius, shadow } = DESIGN_TOKENS;

const badge = css`
  position: absolute;
  top: calc(env(safe-area-inset-top) + ${EDGE_TOP}px);
  left: ${EDGE_LEFT}px;
  display: flex;
  align-items: center;
  gap: ${STAR_GAP}px;
  box-sizing: border-box;
  height: ${HEIGHT}px;
  padding: 0 ${PADDING_RIGHT}px 0 ${PADDING_LEFT}px;
  border: ${line.width}px solid ${color.line};
  border-radius: ${radius.pill}px;
  background: ${color.cream};
  box-shadow: ${shadow.sticker};
  color: ${color.line};
  font-family: ${font.family};
  font-size: ${FONT_SIZE}px;
  font-weight: ${font.weight};
  font-synthesis: none;
  white-space: nowrap;
  pointer-events: none;
`;

const star = css`
  width: ${STAR_SIZE}px;
  height: ${STAR_SIZE}px;
`;
