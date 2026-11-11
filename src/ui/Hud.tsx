import { css } from '@emotion/css';
import type { ReactElement } from 'react';

export interface HudProps {
  wonCount: number;
  totalCount: number;
}

/** 위쪽 가운데의 뽑은 종류 수(예: 2 / 5). 화면을 누르는 데 방해되지 않도록 입력을 받지 않는다. */
export function Hud({ wonCount, totalCount }: HudProps): ReactElement {
  return (
    <div className={badge} role="status">
      {wonCount} / {totalCount}
    </div>
  );
}

/** 390×844 에서 기계 뒷벽 윗변(y≈35)보다 위에 들어가는 높이 */
const EDGE_TOP = 7;
const HEIGHT = 26;
const PADDING_X = 12;
const FONT_SIZE = 15;
const FONT_WEIGHT = 800;
const BACKGROUND = 'rgba(255, 255, 255, 0.75)';
const TEXT_COLOR = '#c21f5c';
const SHADOW = '0 2px 6px rgba(160, 40, 100, 0.2)';
const FONT_FAMILY = `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif`;

const badge = css`
  position: absolute;
  top: calc(env(safe-area-inset-top) + ${EDGE_TOP}px);
  left: 50%;
  transform: translateX(-50%);
  box-sizing: border-box;
  height: ${HEIGHT}px;
  padding: 0 ${PADDING_X}px;
  border-radius: ${HEIGHT / 2}px;
  background: ${BACKGROUND};
  box-shadow: ${SHADOW};
  color: ${TEXT_COLOR};
  font-family: ${FONT_FAMILY};
  font-size: ${FONT_SIZE}px;
  font-weight: ${FONT_WEIGHT};
  line-height: ${HEIGHT}px;
  white-space: nowrap;
  pointer-events: none;
`;
