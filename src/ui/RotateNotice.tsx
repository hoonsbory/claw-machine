import { css } from '@emotion/css';
import type { ReactElement } from 'react';

/**
 * 터치 기기를 가로로 눕혔을 때 9:16 틀 전체를 덮고 세로로 돌려 달라고 알린다. 가로 화면 배치는 따로 만들지 않는다.
 * 축하 화면까지 포함해 틀 안의 모든 것 위에 놓여, 덮는 동안 손가락이 조이스틱·내리기 버튼에 닿지 않는다.
 */
export function RotateNotice(): ReactElement {
  return (
    <div className={overlay} role="alert">
      <span className={phone} aria-hidden />
      <p className={message}>{MESSAGE}</p>
    </div>
  );
}

const MESSAGE = '세로로 돌려 주세요';

/** 축하 화면(10)보다 위 */
const OVERLAY_Z_INDEX = 20;
const PHONE_WIDTH = 34;
const PHONE_HEIGHT = 58;
const PHONE_BORDER = 4;
const PHONE_RADIUS = 8;
const GAP = 14;
const PADDING = 16;
const FONT_SIZE = 20;
const FONT_WEIGHT = 800;
const BACKGROUND = 'linear-gradient(#ffe3ee, #ffc4dc)';
const TEXT_COLOR = '#c21f5c';
const FONT_FAMILY = `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif`;

/** 9:16 틀(position: relative) 안을 가득 덮는다 */
const overlay = css`
  position: absolute;
  inset: 0;
  z-index: ${OVERLAY_Z_INDEX};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${GAP}px;
  padding: ${PADDING}px;
  background: ${BACKGROUND};
  touch-action: none;
`;

/** 세워 든 폰 모양 */
const phone = css`
  box-sizing: border-box;
  width: ${PHONE_WIDTH}px;
  height: ${PHONE_HEIGHT}px;
  border: ${PHONE_BORDER}px solid ${TEXT_COLOR};
  border-radius: ${PHONE_RADIUS}px;
`;

const message = css`
  margin: 0;
  color: ${TEXT_COLOR};
  font-family: ${FONT_FAMILY};
  font-size: ${FONT_SIZE}px;
  font-weight: ${FONT_WEIGHT};
  text-align: center;
`;
