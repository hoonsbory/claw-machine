import { css, keyframes } from '@emotion/css';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { DollKind } from '../game/types';
import { Confetti } from './Confetti';
import { DollStage } from './DollStage';

export interface CelebrationProps {
  kind: DollKind;
  /** 5종을 다 채운 획득이면 색종이가 더 많고 오래가며 글자가 바뀐다 */
  isComplete: boolean;
  onClose: () => void;
}

/**
 * 뽑은 순간의 축하 화면. 9:16 틀 전체를 덮고, 뽑은 인형이 크게 떠올라 천천히 돌며 색종이가 터진다.
 * 틀 전체가 버튼 하나라서 아무 곳이나 누르면(키보드는 스페이스·엔터) 닫힌다.
 * 누른 손을 뗄 때(click) 닫으므로, 닫는 손가락이 그 아래 내리기 버튼이나 조이스틱까지 누르지 않는다.
 * 뜬 직후 CLOSE_GUARD_MS 동안은 눌러도 닫지 않는다. 내리기를 연타하던 손가락이나 누르고 있는 엔터 때문에
 * 축하를(줄 서 있던 다음 축하까지) 보지도 못하고 넘기지 않게 한다.
 * 닫히면 이 화면과 함께 인형을 그리는 작은 3D 캔버스도 사라진다.
 */
export function Celebration({ kind, isComplete, onClose }: CelebrationProps): ReactElement {
  const [isReducedMotion] = useState(prefersReducedMotion);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    shownAt.current = performance.now();
  }, []);

  const handleClick = (): void => {
    if (shownAt.current === null) return;
    if (performance.now() - shownAt.current < CLOSE_GUARD_MS) return;
    onClose();
  };

  return (
    // 열리자마자 키보드 초점을 받아 스페이스·엔터로도 닫힌다
    <button type="button" className={overlay} onClick={handleClick} aria-label={getCaptionText(kind, isComplete)} autoFocus>
      <Confetti burst={isComplete ? 'grand' : 'normal'} isReducedMotion={isReducedMotion} />
      <span className={stage}>
        <DollStage kind={kind} isReducedMotion={isReducedMotion} />
      </span>
      <Caption kind={kind} isComplete={isComplete} />
    </button>
  );
}

/** 뜬 직후 누름을 무시하는 시간(ms) */
const CLOSE_GUARD_MS = 400;

type CaptionProps = Omit<CelebrationProps, 'onClose'>;

/** 글자는 인형 이름과 `뽑았다!` 뿐이다. 5종을 다 채웠으면 이름 아래에 `전부 뽑았다!` 를 더 크게 쓴다. */
function Caption({ kind, isComplete }: CaptionProps): ReactElement {
  return (
    <span className={caption}>
      <span className={dollName}>{kind.displayName}</span>
      <span className={isComplete ? completeText : winText}>{getMessage(isComplete)}</span>
    </span>
  );
}

function getMessage(isComplete: boolean): string {
  if (isComplete) return COMPLETE_MESSAGE;
  return WIN_MESSAGE;
}

function getCaptionText(kind: DollKind, isComplete: boolean): string {
  return `${kind.displayName} ${getMessage(isComplete)}`;
}

const WIN_MESSAGE = '뽑았다!';
const COMPLETE_MESSAGE = '전부 뽑았다!';

/** 움직임 줄이기를 켠 사람에게는 인형을 멈춰 두고 색종이도 터진 모습 한 장만 보여 준다 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const OVERLAY_Z_INDEX = 10;
const STAGE_SIZE = 340;
/** 틀 폭에 대한 인형 칸 폭(%) */
const STAGE_WIDTH_RATIO = 86;
const NAME_FONT_SIZE = 40;
const WIN_FONT_SIZE = 28;
const COMPLETE_FONT_SIZE = 34;
const FONT_WEIGHT = 900;
const CAPTION_GAP = 4;
const FADE_IN_TIME = 0.25;
const POP_TIME = 0.5;
const POP_DELAY = 0.2;
const NAME_COLOR = '#ff3d7f';
const MESSAGE_COLOR = '#c21f5c';
const TEXT_OUTLINE = '0 2px 0 #ffffff, 0 0 12px rgba(255, 255, 255, 0.9)';
const BACKDROP = 'radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.94), rgba(255, 205, 226, 0.9) 70%)';
const FONT_FAMILY = `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pop = keyframes`
  0% { opacity: 0; transform: scale(0.4); }
  70% { opacity: 1; transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
`;

/** 9:16 틀(position: relative) 안을 가득 덮는다 */
const overlay = css`
  position: absolute;
  inset: 0;
  z-index: ${OVERLAY_Z_INDEX};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: ${BACKDROP};
  font-family: ${FONT_FAMILY};
  cursor: pointer;
  outline: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${fadeIn} ${FADE_IN_TIME}s ease-out;
  }
`;

const stage = css`
  position: relative;
  display: block;
  width: min(${STAGE_WIDTH_RATIO}%, ${STAGE_SIZE}px);
  aspect-ratio: 1;
`;

const caption = css`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${CAPTION_GAP}px;
  font-weight: ${FONT_WEIGHT};
  line-height: 1.15;
  text-shadow: ${TEXT_OUTLINE};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${pop} ${POP_TIME}s ${POP_DELAY}s ease-out both;
  }
`;

const dollName = css`
  color: ${NAME_COLOR};
  font-size: ${NAME_FONT_SIZE}px;
`;

const winText = css`
  color: ${MESSAGE_COLOR};
  font-size: ${WIN_FONT_SIZE}px;
`;

const completeText = css`
  color: ${MESSAGE_COLOR};
  font-size: ${COMPLETE_FONT_SIZE}px;
`;
