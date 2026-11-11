import { css } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../theme/tokens';
import { StarDoodle } from './doodles';

export interface HudProps {
  /** 남은 기회 */
  tries: number;
}

/**
 * 남은 기회를 보여 주는 크림색 판. 실제 뽑기 기계의 크레딧 창처럼 조이스틱과 내리기 버튼 사이 빈 띠에 둔다.
 * 위쪽 왼편 구석은 화면 끝과 간판 사이가 좁아(390 폭에서 약 10~92px) `남은 기회 3` 이 한 줄에 들어가지 않는다.
 * 작은 `남은 기회` 아래에 큰 숫자를 쓰고, 판 왼쪽 위 모서리에 작은 별을 스티커처럼 붙였다.
 * 화면 읽기 프로그램에는 `남은 기회 3` 으로 읽히고 숫자가 바뀌면 알린다. 화면을 누르는 데 방해되지 않도록 입력을 받지 않는다.
 */
export function Hud({ tries }: HudProps): ReactElement {
  return (
    <div className={plate} role="status">
      <StarDoodle className={star} />
      <span className={caption}>{LABEL}</span> <span className={count}>{tries}</span>
    </div>
  );
}

const LABEL = '남은 기회';

/** 조이스틱(왼쪽 22 + 폭 132)과 내리기 버튼(오른쪽 26 + 폭 104)이 차지하는 가장자리 폭 */
const JOYSTICK_SIDE = 22 + 132;
const DROP_BUTTON_SIDE = 26 + 104;
/** 두 조작부 사이 빈 띠의 가운데는 틀 가운데보다 이만큼 오른쪽이다 */
const STRIP_CENTER_SHIFT = (JOYSTICK_SIDE - DROP_BUTTON_SIDE) / 2;
/**
 * 판 크기와 아래 여백. 375 폭에서 빈 띠는 가장 좁은 곳(두 원의 가운데 높이)이 91px 이라,
 * 판을 두 원의 가운데보다 아래(원이 좁아지는 곳)에 두어 양옆에 틈을 남긴다.
 */
const WIDTH = 80;
const EDGE_BOTTOM = 14;
const PADDING_Y = 9;
const LINE_GAP = 3;
const CAPTION_FONT_SIZE = 13;
const COUNT_FONT_SIZE = 30;
/** 판 안쪽에 바느질한 듯 그은 점선과 판 테두리 사이(px) */
const STITCH_INSET = 4;
/** 판 왼쪽 위 모서리에 걸친 별: 크기, 판 밖으로 나온 거리(px), 기울기 */
const STAR_SIZE = 20;
const STAR_OVERHANG = 8;
const STAR_TILT = -14;

const { color, font, line, radius, shadow } = DESIGN_TOKENS;

const plate = css`
  position: absolute;
  left: calc(50% + ${STRIP_CENTER_SHIFT}px);
  bottom: calc(env(safe-area-inset-bottom) + ${EDGE_BOTTOM}px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${LINE_GAP}px;
  box-sizing: border-box;
  width: ${WIDTH}px;
  padding: ${PADDING_Y}px 0;
  border: ${line.width}px solid ${color.line};
  border-radius: ${radius.panel}px;
  background: ${color.cream};
  box-shadow: ${shadow.sticker};
  color: ${color.line};
  font-family: ${font.family};
  font-weight: ${font.weight};
  font-synthesis: none;
  line-height: 1;
  white-space: nowrap;
  transform: translateX(-50%);
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    inset: ${STITCH_INSET}px;
    border: ${line.width}px dashed ${color.peachDeep};
    border-radius: ${radius.panel - STITCH_INSET}px;
  }
`;

const star = css`
  position: absolute;
  top: ${-STAR_OVERHANG}px;
  left: ${-STAR_OVERHANG}px;
  width: ${STAR_SIZE}px;
  height: ${STAR_SIZE}px;
  transform: rotate(${STAR_TILT}deg);
`;

const caption = css`
  font-size: ${CAPTION_FONT_SIZE}px;
`;

const count = css`
  font-size: ${COUNT_FONT_SIZE}px;
`;
