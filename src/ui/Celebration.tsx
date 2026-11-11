import { css, keyframes } from '@emotion/css';
import { Component, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { DollKind } from '../game/types';
import { DESIGN_TOKENS } from '../theme/tokens';
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
        <StageBoundary>
          <DollStage kind={kind} isReducedMotion={isReducedMotion} />
        </StageBoundary>
      </span>
      <Caption kind={kind} isComplete={isComplete} />
    </button>
  );
}

/** 뜬 직후 누름을 무시하는 시간(ms) */
const CLOSE_GUARD_MS = 400;

interface StageBoundaryProps {
  children: ReactNode;
}

interface StageBoundaryState {
  hasFailed: boolean;
}

/**
 * 인형을 그리는 작은 3D 캔버스가 실패하면(WebGL 을 더 만들 수 없는 폰 등) 인형만 빼고 그린다.
 * 오류가 앱 전체로 번져 화면이 하얗게 되지 않고, 인형 이름·글자·색종이는 그대로 보인다.
 */
class StageBoundary extends Component<StageBoundaryProps, StageBoundaryState> {
  state: StageBoundaryState = { hasFailed: false };

  static getDerivedStateFromError(): StageBoundaryState {
    return { hasFailed: true };
  }

  render(): ReactNode {
    if (this.state.hasFailed) return null;
    return this.props.children;
  }
}

type CaptionProps = Omit<CelebrationProps, 'onClose'>;

/**
 * 글자는 인형 이름과 `뽑았다!` 뿐이다. 5종을 다 채웠으면 이름 아래에 `전부 뽑았다!` 를 더 크게 쓴다.
 * 색종이 위에서도 읽히도록 갈색 테두리의 크림색 판 위에 갈색 글자로 쓴다.
 */
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
const CAPTION_GAP = 2;
const PLATE_PADDING_Y = 10;
const PLATE_PADDING_X = 26;
/** 글자판 안쪽에 바느질한 듯 그은 점선과 판 테두리 사이(px) */
const PLATE_STITCH_INSET = 5;
const FADE_IN_TIME = 0.25;
const POP_TIME = 0.5;
const POP_DELAY = 0.2;

const { color, font, line, radius, shadow } = DESIGN_TOKENS;

/** 크림색에서 복숭아색으로 번지는 은은한 빛 */
const BACKDROP = `radial-gradient(circle at 50% 42%, ${color.glowCenter}, ${color.glowEdge} 70%)`;

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
  font-family: ${font.family};
  font-synthesis: none;
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
  padding: ${PLATE_PADDING_Y}px ${PLATE_PADDING_X}px;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: ${radius.panel}px;
  background: ${color.cream};
  box-shadow: ${shadow.plate};
  color: ${color.line};
  font-weight: ${font.weight};
  line-height: 1.15;

  &::before {
    content: '';
    position: absolute;
    inset: ${PLATE_STITCH_INSET}px;
    border: ${line.width}px dashed ${color.peachDeep};
    border-radius: ${radius.panel - PLATE_STITCH_INSET}px;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    animation: ${pop} ${POP_TIME}s ${POP_DELAY}s ease-out both;
  }
`;

const dollName = css`
  font-size: ${NAME_FONT_SIZE}px;
`;

const winText = css`
  font-size: ${WIN_FONT_SIZE}px;
`;

const completeText = css`
  font-size: ${COMPLETE_FONT_SIZE}px;
`;
