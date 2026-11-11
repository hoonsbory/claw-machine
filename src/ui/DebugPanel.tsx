import { css } from '@emotion/css';
import { useId, useState, type KeyboardEvent, type ReactElement } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import { applyTuning, type TuningOverrides } from '../config/runtimeTuning';
import { DESIGN_TOKENS } from '../theme/tokens';

export interface DebugPanelProps {
  overrides: TuningOverrides;
  onChange: (next: TuningOverrides) => void;
  failStreak: number;
  /** 이 기기에서 뽑은 기록을 저장할 수 있는지 */
  canSaveProgress: boolean;
}

/**
 * 주소에 ?debug 를 붙였을 때만 뜨는 조정 패널. 위쪽 왼편, 뽑은 수 배지 아래에 접힌 채 있다가 누르면 펼쳐진다.
 * 집기 수치 셋을 슬라이더로 바꾸고, 지금 연속 실패 수와 이 기기에서 뽑은 기록을 저장할 수 있는지 보여 준다.
 * 바꾼 값은 다음 시도부터 적용되고 저장하지 않는다.
 */
export function DebugPanel({ overrides, onChange, failStreak, canSaveProgress }: DebugPanelProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const bodyId = useId();
  const current = applyTuning(GAME_CONFIG, overrides).grab;

  return (
    <div className={panel}>
      <button
        type="button"
        className={toggle}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={(): void => setIsOpen(!isOpen)}
      >
        조정
      </button>
      {isOpen && (
        <div id={bodyId} className={body}>
          {SLIDERS.map((slider) => (
            <label key={slider.key} className={row}>
              <span className={rowHead}>
                <span>{slider.label}</span>
                <span className={valueText}>{current[slider.key].toFixed(slider.fractionDigits)}</span>
              </span>
              <input
                type="range"
                className={range}
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={current[slider.key]}
                onChange={(event): void => onChange({ ...overrides, [slider.key]: Number(event.currentTarget.value) })}
                onKeyDown={keepKeysForGame}
              />
            </label>
          ))}
          <p className={streak}>
            연속 실패 <strong>{failStreak}</strong>
          </p>
          <p className={streak}>
            기록 저장 <strong>{getSaveStatus(canSaveProgress)}</strong>
          </p>
          <p className={note}>다음 시도부터 적용 · 새로고침하면 사라짐</p>
        </div>
      )}
    </div>
  );
}

function getSaveStatus(canSaveProgress: boolean): string {
  if (canSaveProgress) return SAVE_AVAILABLE_TEXT;
  return SAVE_BLOCKED_TEXT;
}

const SAVE_AVAILABLE_TEXT = '가능';
const SAVE_BLOCKED_TEXT = '불가 · 새로고침하면 뽑은 인형이 다시 나온다';

/** 슬라이더 값을 바꾸는 키. 방향키는 집게 조작이기도 하다. */
const RANGE_VALUE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * 슬라이더를 만진 뒤 초점이 남아 있어도 키로는 값이 바뀌지 않게 한다. 방향키로 집게를 움직이다 집게 힘이 몰래 바뀌는 일을 막는다.
 * 키 입력은 그대로 창까지 올라가 게임에 전달되고, Tab 으로 초점을 옮기는 것은 막지 않는다.
 */
function keepKeysForGame(event: KeyboardEvent<HTMLInputElement>): void {
  if (RANGE_VALUE_KEYS.has(event.key)) event.preventDefault();
}

/** 슬라이더 하나: 바꿀 값, 이름, 범위와 간격, 보여 줄 소수 자리 */
interface SliderSpec {
  key: keyof TuningOverrides;
  label: string;
  min: number;
  max: number;
  step: number;
  fractionDigits: number;
}

const SLIDERS: readonly SliderSpec[] = [
  { key: 'grip', label: '집게 힘', min: 0, max: 1, step: 0.05, fractionDigits: 2 },
  { key: 'reachMargin', label: '닿는 여유', min: 0.1, max: 0.8, step: 0.05, fractionDigits: 2 },
  { key: 'pityAfterFails', label: '보정까지 실패 횟수', min: 1, max: 6, step: 1, fractionDigits: 0 },
];

/** 위쪽 왼편 구석의 뽑은 수 배지(높이 30, 위 6) 바로 아래 */
const EDGE_TOP = 44;
const EDGE_LEFT = 10;
const TOGGLE_HEIGHT = 30;
const TOGGLE_PADDING_X = 12;
const BODY_GAP = 6;
const BODY_WIDTH = 220;
const BODY_PADDING = 12;
const BODY_RADIUS = 12;
const ROW_GAP = 10;
const FONT_SIZE = 13;
const NOTE_FONT_SIZE = 11;
const FONT_WEIGHT = DESIGN_TOKENS.font.weight;
const BACKGROUND = DESIGN_TOKENS.color.panel;
const TEXT_COLOR = DESIGN_TOKENS.color.line;
/** 슬라이더 막대 색. 글자는 읽기 쉽게 모두 갈색이다. */
const ACCENT_COLOR = DESIGN_TOKENS.color.coralDeep;
const NOTE_COLOR = DESIGN_TOKENS.color.lineSoft;
const SHADOW = DESIGN_TOKENS.shadow.sticker;
const FONT_FAMILY = DESIGN_TOKENS.font.family;

const panel = css`
  position: absolute;
  top: calc(env(safe-area-inset-top) + ${EDGE_TOP}px);
  left: ${EDGE_LEFT}px;
  color: ${TEXT_COLOR};
  font-family: ${FONT_FAMILY};
  font-size: ${FONT_SIZE}px;
  font-synthesis: none;
  touch-action: none;
`;

const toggle = css`
  height: ${TOGGLE_HEIGHT}px;
  padding: 0 ${TOGGLE_PADDING_X}px;
  border: 0;
  border-radius: ${TOGGLE_HEIGHT / 2}px;
  background: ${BACKGROUND};
  box-shadow: ${SHADOW};
  color: ${TEXT_COLOR};
  font: inherit;
  font-weight: ${FONT_WEIGHT};
  -webkit-tap-highlight-color: transparent;
`;

const body = css`
  display: flex;
  flex-direction: column;
  gap: ${ROW_GAP}px;
  box-sizing: border-box;
  width: ${BODY_WIDTH}px;
  margin-top: ${BODY_GAP}px;
  padding: ${BODY_PADDING}px;
  border-radius: ${BODY_RADIUS}px;
  background: ${BACKGROUND};
  box-shadow: ${SHADOW};
`;

const row = css`
  display: flex;
  flex-direction: column;
`;

const rowHead = css`
  display: flex;
  justify-content: space-between;
`;

const valueText = css`
  color: ${TEXT_COLOR};
  font-weight: ${FONT_WEIGHT};
  font-variant-numeric: tabular-nums;
`;

const range = css`
  width: 100%;
  margin: 0;
  accent-color: ${ACCENT_COLOR};
`;

const streak = css`
  margin: 0;

  strong {
    color: ${TEXT_COLOR};
  }
`;

const note = css`
  margin: 0;
  color: ${NOTE_COLOR};
  font-size: ${NOTE_FONT_SIZE}px;
`;
