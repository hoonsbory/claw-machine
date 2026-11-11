import { css } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../theme/tokens';

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
const PHONE_WIDTH = 36;
const PHONE_HEIGHT = 60;
const PHONE_RADIUS = 10;
/** 세워 든 폰 화면 아래의 작은 단추 */
const PHONE_BUTTON_SIZE = 6;
const PHONE_BUTTON_BOTTOM = 5;
const GAP = 14;
const PADDING = 16;
const FONT_SIZE = 22;

const { color, font, line, shadow } = DESIGN_TOKENS;

/** 9:16 틀(position: relative) 안을 가득 덮는다. 게임 바탕과 같은 하늘색 → 크림색 하늘이다. */
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
  background: linear-gradient(${color.sky}, ${color.cream} 78%);
  touch-action: none;
`;

/** 세워 든 폰 모양: 갈색 테두리의 크림색 둥근 판 */
const phone = css`
  position: relative;
  box-sizing: border-box;
  width: ${PHONE_WIDTH}px;
  height: ${PHONE_HEIGHT}px;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: ${PHONE_RADIUS}px;
  background: ${color.cream};
  box-shadow: ${shadow.sticker};

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: ${PHONE_BUTTON_BOTTOM}px;
    width: ${PHONE_BUTTON_SIZE}px;
    height: ${PHONE_BUTTON_SIZE}px;
    margin-left: ${-PHONE_BUTTON_SIZE / 2}px;
    border-radius: 50%;
    background: ${color.coral};
  }
`;

const message = css`
  margin: 0;
  color: ${color.line};
  font-family: ${font.family};
  font-size: ${FONT_SIZE}px;
  font-weight: ${font.weight};
  font-synthesis: none;
  text-align: center;
`;
