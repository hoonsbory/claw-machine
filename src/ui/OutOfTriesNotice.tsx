import { css } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../theme/tokens';
import { HeartDoodle } from './doodles';

export interface OutOfTriesNoticeProps {
  /** 기회를 다 쓰고 집게가 쉬고 있으며 축하 화면이 닫혀 있을 때 true */
  isVisible: boolean;
}

/**
 * 기회를 다 썼을 때 조작부 바로 위(기계 아래 몸통 위, 바닥은 가리지 않는다)에 뜨는 두 줄 안내.
 * 충전은 주인이 숨은 충전 페이지에서 해 주므로, 주인에게 뽀뽀를 해 달라고 하라는 안내다.
 * 알림 칸은 늘 두고 안의 글만 넣고 빼서, 안내가 뜨는 순간 화면 읽기 프로그램이 읽는다. 누르기는 그대로 통과한다.
 */
export function OutOfTriesNotice({ isVisible }: OutOfTriesNoticeProps): ReactElement {
  return (
    <div className={region} role="status">
      {isVisible && (
        <p className={plate}>
          <span className={titleLine}>{TITLE}</span>{' '}
          <span className={hintLine}>
            {HINT}
            <HeartDoodle className={heart} />
          </span>
        </p>
      )}
    </div>
  );
}

const TITLE = '기회를 다 썼어요';
const HINT = '충전하려면 뽀뽀를 해 주세요';

/** 조이스틱 윗변(아래 26 + 폭 132)보다 이만큼 위에 판 아랫변을 둔다 */
const CONTROLS_TOP = 26 + 132;
const GAP_ABOVE_CONTROLS = 12;
const EDGE_BOTTOM = CONTROLS_TOP + GAP_ABOVE_CONTROLS;
const PADDING_Y = 10;
const PADDING_X = 18;
const LINE_GAP = 4;
const TITLE_FONT_SIZE = 20;
const HINT_FONT_SIZE = 15;
const HEART_SIZE = 17;
const HEART_GAP = 4;
/** 판 안쪽에 바느질한 듯 그은 점선과 판 테두리 사이(px) */
const STITCH_INSET = 5;

const { color, font, line, radius, shadow } = DESIGN_TOKENS;

const region = css`
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + ${EDGE_BOTTOM}px);
  display: flex;
  justify-content: center;
  pointer-events: none;
`;

const plate = css`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${LINE_GAP}px;
  margin: 0;
  padding: ${PADDING_Y}px ${PADDING_X}px;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: ${radius.panel}px;
  background: ${color.cream};
  box-shadow: ${shadow.plate};
  color: ${color.line};
  font-family: ${font.family};
  font-weight: ${font.weight};
  font-synthesis: none;
  line-height: 1.15;
  white-space: nowrap;

  &::before {
    content: '';
    position: absolute;
    inset: ${STITCH_INSET}px;
    border: ${line.width}px dashed ${color.peachDeep};
    border-radius: ${radius.panel - STITCH_INSET}px;
  }
`;

const titleLine = css`
  font-size: ${TITLE_FONT_SIZE}px;
`;

const hintLine = css`
  display: flex;
  align-items: center;
  gap: ${HEART_GAP}px;
  font-size: ${HINT_FONT_SIZE}px;
`;

const heart = css`
  flex: none;
  width: ${HEART_SIZE}px;
  height: ${HEART_SIZE}px;
`;
