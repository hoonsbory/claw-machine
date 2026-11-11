import { css } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../theme/tokens';

/**
 * 틀 맨 아래 가운데에 작게 적는 만든 사람 이름. 게임 화면과 충전 페이지 모두 바탕 그림 바로 위에 깔려,
 * 조작부·남은 기회 판보다 아래(판 아래 여백 14px 안)에 보이고 누르는 데 끼어들지 않는다.
 */
export function Credit(): ReactElement {
  return <p className={credit}>{CREDIT_TEXT}</p>;
}

const CREDIT_TEXT = 'made by Jae Hun';

const EDGE_BOTTOM = 2;
const FONT_SIZE = 11;
const LETTER_SPACING = 0.4;
/** 장식처럼 옅게 보이도록 낮춘 불투명도 */
const OPACITY = 0.75;

const { color, font } = DESIGN_TOKENS;

const credit = css`
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + ${EDGE_BOTTOM}px);
  margin: 0;
  color: ${color.line};
  font-family: ${font.family};
  font-size: ${FONT_SIZE}px;
  font-weight: ${font.weight};
  font-synthesis: none;
  letter-spacing: ${LETTER_SPACING}px;
  line-height: 1;
  text-align: center;
  opacity: ${OPACITY};
  pointer-events: none;
`;
