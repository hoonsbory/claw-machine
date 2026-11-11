import { css } from '@emotion/css';
import type { MouseEvent, ReactElement } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import type { KeyValueStorage } from '../game/progressStore';
import { useTries } from '../session/useTries';
import { DESIGN_TOKENS } from '../theme/tokens';
import { ChargeDecorations } from './ChargeDecorations';
import { removeHash } from './chargeRoute';
import { HeartDoodle, StarDoodle } from './doodles';
import { leaveChargeRoute } from './useChargeRoute';

export interface ChargePageProps {
  storage: KeyValueStorage;
}

/**
 * 주인만 아는 기회 충전 페이지(주소 끝 `#charge`). 게임 화면에는 여기로 오는 단추가 없다.
 * 게임과 같은 9:16 틀과 하늘 바탕 위에 제목, 안내, 지금 남은 기회, 충전 단추 둘, 게임으로 돌아가는 링크를 위에서 아래로 놓는다.
 * 제목과 남은 기회 둘레에 캐릭터 그림을 두고, 아래 언덕에는 장난감 차를 탄 캐릭터가 지나간다(ChargeDecorations).
 * 충전은 저장소 값에 바로 더해 저장한다. 다른 탭에 열린 게임은 탭으로 돌아올 때 새 값을 읽는다.
 * 남은 기회가 최대이면 충전 단추를 끈다.
 */
export function ChargePage({ storage }: ChargePageProps): ReactElement {
  const { tries, add } = useTries(storage);
  const isFull = tries >= GAME_CONFIG.tries.max;

  // 새로고침 없이 게임 화면으로 돌아간다. 스크립트가 막혀도 링크 주소(해시를 뗀 지금 주소)로 돌아간다.
  const goToGame = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    leaveChargeRoute();
  };

  return (
    <section className={page}>
      <div className={decoAnchor}>
        <ChargeDecorations anchor="title" />
        <h1 className={title}>
          <HeartDoodle className={titleMark} />
          {TITLE}
          <StarDoodle className={titleMark} />
        </h1>
      </div>
      <p className={caption}>{CAPTION}</p>
      <div className={decoAnchor}>
        <ChargeDecorations anchor="count" />
        <p className={countPlate} aria-live="polite" aria-atomic>
          <span className={countLabel}>{COUNT_LABEL}</span> <span className={countNumber}>{tries}</span>
        </p>
      </div>
      <div className={buttonRow}>
        {CHARGE_AMOUNTS.map((amount) => (
          <button key={amount} type="button" className={chargeButton} disabled={isFull} onClick={(): void => add(amount)}>
            +{amount}
          </button>
        ))}
      </div>
      <a className={backLink} href={removeHash(window.location.href)} onClick={goToGame}>
        {BACK_TEXT}
      </a>
      <ChargeDecorations anchor="page" />
    </section>
  );
}

const TITLE = '기회 충전';
const CAPTION = '뽀뽀 받았으면 충전!';
const COUNT_LABEL = '남은 기회';
const BACK_TEXT = '게임으로 돌아가기';
/** 단추 하나가 더하는 기회 수 */
const CHARGE_AMOUNTS = [1, 5] as const;

const PAGE_PADDING_Y = 24;
const PAGE_PADDING_X = 16;
const SECTION_GAP = 18;
const TITLE_FONT_SIZE = 30;
const TITLE_PADDING_Y = 8;
const TITLE_PADDING_X = 18;
const TITLE_MARK_SIZE = 22;
const TITLE_MARK_GAP = 8;
const CAPTION_FONT_SIZE = 17;
const COUNT_PADDING_Y = 14;
const COUNT_WIDTH = 168;
const COUNT_LINE_GAP = 6;
const COUNT_LABEL_FONT_SIZE = 20;
const COUNT_NUMBER_FONT_SIZE = 60;
/** 판 안쪽에 바느질한 듯 그은 점선과 판 테두리 사이(px) */
const STITCH_INSET = 5;
const BUTTON_GAP = 18;
const BUTTON_WIDTH = 96;
const BUTTON_HEIGHT = 64;
const BUTTON_FONT_SIZE = 30;
/** 눌렀을 때 내려가는 거리와 그만큼 줄어드는 아래 두께(px). 내리기 버튼과 같은 사탕 단추다. */
const PRESS_DEPTH = 4;
const LIP_DEPTH = 6;
const PRESSED_LIP_DEPTH = LIP_DEPTH - PRESS_DEPTH;
const FOCUS_RING_OFFSET = 4;
const BACK_FONT_SIZE = 18;
const BACK_PADDING = 10;
const UNDERLINE_OFFSET = 4;

const { color, font, line, radius, shadow } = DESIGN_TOKENS;

/** 둥근 면 아래로 같은 모양의 두께를 그리고, 그 두께까지 갈색 테두리로 감싼다 */
function getLipShadow(lipDepth: number, lipColor: string, outlineColor: string): string {
  return `0 ${lipDepth}px 0 0 ${lipColor}, 0 ${lipDepth}px 0 ${line.thickWidth}px ${outlineColor}`;
}

/** 9:16 틀(position: relative) 안을 채우고 가운데에 세로로 늘어놓는다. 바탕은 틀에 깔린 하늘 그림이 그대로 보인다. */
const page = css`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${SECTION_GAP}px;
  box-sizing: border-box;
  padding: calc(env(safe-area-inset-top) + ${PAGE_PADDING_Y}px) ${PAGE_PADDING_X}px
    calc(env(safe-area-inset-bottom) + ${PAGE_PADDING_Y}px);
  color: ${color.line};
  font-family: ${font.family};
  font-weight: ${font.weight};
  font-synthesis: none;
  text-align: center;
`;

/** 제목과 남은 기회 판을 감싸, 둘레의 캐릭터 그림이 이 상자를 기준으로 자리를 잡게 한다 */
const decoAnchor = css`
  position: relative;
`;

/** 기계 간판처럼 버터색 판에 갈색 글자, 양옆에 하트와 별. 둘레의 캐릭터 그림보다 앞에 그려져 그림 끝이 판 뒤로 숨는다. */
const title = css`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${TITLE_MARK_GAP}px;
  margin: 0;
  padding: ${TITLE_PADDING_Y}px ${TITLE_PADDING_X}px;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: ${radius.panel}px;
  background: ${color.butter};
  box-shadow: ${shadow.sticker};
  font-size: ${TITLE_FONT_SIZE}px;
  font-weight: inherit;
  line-height: 1.1;
`;

const titleMark = css`
  flex: none;
  width: ${TITLE_MARK_SIZE}px;
  height: ${TITLE_MARK_SIZE}px;
`;

const caption = css`
  margin: 0;
  font-size: ${CAPTION_FONT_SIZE}px;
`;

const countPlate = css`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${COUNT_LINE_GAP}px;
  box-sizing: border-box;
  width: ${COUNT_WIDTH}px;
  margin: 0;
  padding: ${COUNT_PADDING_Y}px 0;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: ${radius.panel}px;
  background: ${color.cream};
  box-shadow: ${shadow.plate};
  line-height: 1;

  &::before {
    content: '';
    position: absolute;
    inset: ${STITCH_INSET}px;
    border: ${line.width}px dashed ${color.peachDeep};
    border-radius: ${radius.panel - STITCH_INSET}px;
  }
`;

const countLabel = css`
  font-size: ${COUNT_LABEL_FONT_SIZE}px;
`;

const countNumber = css`
  font-size: ${COUNT_NUMBER_FONT_SIZE}px;
`;

const buttonRow = css`
  display: flex;
  gap: ${BUTTON_GAP}px;
  padding-bottom: ${LIP_DEPTH}px;
`;

const chargeButton = css`
  box-sizing: border-box;
  width: ${BUTTON_WIDTH}px;
  height: ${BUTTON_HEIGHT}px;
  padding: 0;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: ${radius.pill}px;
  background: ${color.coral};
  box-shadow: ${getLipShadow(LIP_DEPTH, color.coralDeep, color.line)};
  color: ${color.line};
  font-family: inherit;
  font-size: ${BUTTON_FONT_SIZE}px;
  font-weight: inherit;
  font-synthesis: none;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:active:enabled {
    transform: translateY(${PRESS_DEPTH}px);
    box-shadow: ${getLipShadow(PRESSED_LIP_DEPTH, color.coralDeep, color.line)};
  }

  &:focus-visible {
    outline: ${line.width}px solid ${color.coralDeep};
    outline-offset: ${FOCUS_RING_OFFSET + LIP_DEPTH}px;
  }

  &:disabled {
    border-color: ${color.lineSoft};
    background: ${color.disabledFace};
    box-shadow: ${getLipShadow(LIP_DEPTH, color.disabledLip, color.lineSoft)};
    color: ${color.lineSoft};
    cursor: default;
  }
`;

const backLink = css`
  padding: ${BACK_PADDING}px;
  border-radius: ${radius.panel}px;
  color: ${color.line};
  font-size: ${BACK_FONT_SIZE}px;
  text-decoration: underline;
  text-underline-offset: ${UNDERLINE_OFFSET}px;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: ${line.width}px solid ${color.coralDeep};
  }
`;
