import { css, keyframes } from '@emotion/css';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Group, Vector3Tuple } from 'three';
import type { DollKind } from '../game/types';
import { DollModel } from '../scene/DollModel';

export interface CelebrationProps {
  kind: DollKind;
  /** 5종을 다 채운 획득이면 색종이가 더 많고 오래가며 글자가 바뀐다 */
  isComplete: boolean;
  onClose: () => void;
}

/**
 * 뽑은 순간의 축하 화면. 화면 전체를 덮고, 뽑은 인형이 크게 떠올라 천천히 돌며 색종이가 터진다.
 * 화면 전체가 버튼 하나라서 아무 곳이나 누르면(키보드는 스페이스·엔터) 닫힌다.
 * 누른 손을 뗄 때(click) 닫으므로, 닫는 손가락이 그 아래 내리기 버튼이나 조이스틱까지 누르지 않는다.
 * 닫히면 이 화면과 함께 인형을 그리는 작은 3D 캔버스도 사라진다.
 */
export function Celebration({ kind, isComplete, onClose }: CelebrationProps): ReactElement {
  const [isReducedMotion] = useState(prefersReducedMotion);

  return (
    // 열리자마자 키보드 초점을 받아 스페이스·엔터로도 닫힌다
    <button type="button" className={overlay} onClick={onClose} aria-label={getCaptionText(kind, isComplete)} autoFocus>
      <Confetti burst={isComplete ? COMPLETE_BURST : WIN_BURST} isReducedMotion={isReducedMotion} />
      <span className={stage}>
        <DollStage kind={kind} isReducedMotion={isReducedMotion} />
      </span>
      <Caption kind={kind} isComplete={isComplete} />
    </button>
  );
}

type CaptionProps = Omit<CelebrationProps, 'onClose'>;

/** 글자는 인형 이름과 `뽑았다!` 뿐이다. 5종을 다 채웠으면 `전부 뽑았다!` 만 크게 쓴다. */
function Caption({ kind, isComplete }: CaptionProps): ReactElement {
  if (isComplete) {
    return (
      <span className={caption}>
        <span className={completeText}>{COMPLETE_MESSAGE}</span>
      </span>
    );
  }
  return (
    <span className={caption}>
      <span className={dollName}>{kind.displayName}</span>
      <span className={winText}>{WIN_MESSAGE}</span>
    </span>
  );
}

function getCaptionText(kind: DollKind, isComplete: boolean): string {
  if (isComplete) return COMPLETE_MESSAGE;
  return `${kind.displayName} ${WIN_MESSAGE}`;
}

const WIN_MESSAGE = '뽑았다!';
const COMPLETE_MESSAGE = '전부 뽑았다!';

/** 움직임 줄이기를 켠 사람에게는 인형을 멈춰 두고 색종이도 터진 모습 한 장만 보여 준다 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── 떠오르는 인형 ──────────────────────────────────────────────

interface DollStageProps {
  kind: DollKind;
  isReducedMotion: boolean;
}

/** 인형 하나만 그리는 작은 3D 캔버스. 물리·그림자 없이 조명 둘만 쓴다. 움직임이 없으면 필요할 때만 그린다. */
function DollStage({ kind, isReducedMotion }: DollStageProps): ReactElement {
  return (
    <Canvas flat dpr={[1, MAX_PIXEL_RATIO]} camera={STAGE_CAMERA} frameloop={isReducedMotion ? 'demand' : 'always'}>
      <hemisphereLight args={[SKY_COLOR, GROUND_COLOR, SKY_INTENSITY]} />
      <directionalLight position={SUN_POSITION} intensity={SUN_INTENSITY} />
      <FloatingDoll kind={kind} isReducedMotion={isReducedMotion} />
    </Canvas>
  );
}

/** 아래에서 커지며 떠올라 살짝 위아래로 흔들리며 천천히 돈다. 종류마다 크기가 달라도 같은 크기로 보여 준다. */
function FloatingDoll({ kind, isReducedMotion }: DollStageProps): ReactElement {
  const groupRef = useRef<Group>(null);
  const elapsed = useRef(0);

  useFrame((_, delta): void => {
    const group = groupRef.current;
    if (group === null || isReducedMotion) return;

    elapsed.current += delta;
    const time = elapsed.current;
    const rise = easeOutBack(Math.min(time / RISE_TIME, 1));
    group.position.y = RISE_DEPTH * (rise - 1) + Math.sin(time * BOB_SPEED) * BOB_HEIGHT;
    group.scale.setScalar(RISE_START_SCALE + (1 - RISE_START_SCALE) * rise);
    group.rotation.y = REST_TURN + time * SPIN_SPEED;
  });

  return (
    <group ref={groupRef} rotation={[0, REST_TURN, 0]}>
      <group scale={1 / kind.scale} position={[0, -DOLL_CENTER_Y, 0]}>
        <DollModel kind={kind} />
      </group>
    </group>
  );
}

/** 넘치듯 커졌다가 제자리에 닿는 곡선(0→1) */
function easeOutBack(progress: number): number {
  const shifted = progress - 1;
  return 1 + (EASE_OVERSHOOT + 1) * shifted ** 3 + EASE_OVERSHOOT * shifted ** 2;
}

const MAX_PIXEL_RATIO = 2;
const STAGE_CAMERA = { position: [0, 0, 4.2] as Vector3Tuple, fov: 35 };
const SKY_COLOR = '#ffffff';
const GROUND_COLOR = '#ffc4dc';
const SKY_INTENSITY = 1.6;
const SUN_POSITION: Vector3Tuple = [2, 4, 5];
const SUN_INTENSITY = 1.6;
/** 임시 도형(scale 1)의 몸통 아래 끝(-0.5)과 귀 끝(약 1.05) 사이 가운데. 이만큼 내려 화면 가운데에 둔다. */
const DOLL_CENTER_Y = 0.27;
/** 정면에서 살짝 돌려 둔 각도(라디안). 움직임을 줄여도 입체로 보인다. */
const REST_TURN = -0.35;
const RISE_TIME = 0.7;
const RISE_DEPTH = 1.2;
const RISE_START_SCALE = 0.4;
const EASE_OVERSHOOT = 1.7;
const BOB_SPEED = 2.2;
const BOB_HEIGHT = 0.06;
/** 한 바퀴에 약 8초 */
const SPIN_SPEED = 0.8;

// ── 색종이 ───────────────────────────────────────────────────

/** 한 번의 축하에 터지는 색종이: 조각 수, 터지는 횟수, 전체 시간(초) */
interface ConfettiBurst {
  pieceCount: number;
  waveCount: number;
  duration: number;
}

interface ConfettiProps {
  burst: ConfettiBurst;
  isReducedMotion: boolean;
}

/** 색종이 조각 하나. 위치·속도는 px, px/초다. */
interface Piece {
  launchAt: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  width: number;
  height: number;
  color: string;
  angle: number;
  spin: number;
  flutter: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

const WIN_BURST: ConfettiBurst = { pieceCount: 90, waveCount: 1, duration: 2.6 };
const COMPLETE_BURST: ConfettiBurst = { pieceCount: 260, waveCount: 4, duration: 5.5 };

/** 화면 전체에 깔린 2D 캔버스에 색종이를 그린다. 새 의존성 없이 직접 움직인다. */
function Confetti({ burst, isReducedMotion }: ConfettiProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d') ?? null;
    if (canvas === null || context === null) return;

    const size = fitToDisplay(canvas, context);
    const pieces = launchPieces(burst, size);
    if (isReducedMotion) {
      drawStillBurst(context, pieces);
      return;
    }

    let frameId = 0;
    let elapsed = 0;
    let lastTime = performance.now();
    const tick = (now: number): void => {
      const delta = Math.min((now - lastTime) / MS_PER_SECOND, MAX_FRAME_DELTA);
      lastTime = now;
      elapsed += delta;
      context.clearRect(0, 0, size.width, size.height);
      if (elapsed >= burst.duration) return;

      stepPieces(pieces, elapsed, delta, size);
      drawPieces(context, pieces, elapsed, getFade(elapsed, burst.duration));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return (): void => cancelAnimationFrame(frameId);
  }, [burst, isReducedMotion]);

  return <canvas ref={canvasRef} className={confettiCanvas} aria-hidden />;
}

/** 캔버스 픽셀을 화면 배율에 맞추고, 그리는 좌표는 CSS px 로 쓰게 한다 */
function fitToDisplay(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): CanvasSize {
  const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
  const size = { width: canvas.clientWidth, height: canvas.clientHeight };
  canvas.width = Math.round(size.width * ratio);
  canvas.height = Math.round(size.height * ratio);
  context.scale(ratio, ratio);
  return size;
}

/** 조각을 터지는 횟수만큼 나눠 가운데 → 왼쪽 → 오른쪽 → 다시 가운데 차례로, 조금씩 시간을 두고 위로 쏘아 올린다 */
function launchPieces({ pieceCount, waveCount }: ConfettiBurst, size: CanvasSize): Piece[] {
  // 화면 높이에 맞춰 속도와 중력을 늘리고 줄여 어느 화면에서나 비슷한 높이까지 오른다
  const scale = size.height / REFERENCE_HEIGHT;
  return Array.from({ length: pieceCount }, (_, index): Piece => {
    const wave = index % waveCount;
    const direction = -Math.PI / 2 + randomBetween(-LAUNCH_SPREAD, LAUNCH_SPREAD);
    const speed = randomBetween(MIN_SPEED, MAX_SPEED) * scale;
    return {
      launchAt: wave * WAVE_GAP,
      x: size.width * WAVE_ORIGINS_X[wave % WAVE_ORIGINS_X.length],
      y: size.height * ORIGIN_Y,
      velocityX: Math.cos(direction) * speed,
      velocityY: Math.sin(direction) * speed,
      width: randomBetween(MIN_PIECE_SIZE, MAX_PIECE_SIZE),
      height: randomBetween(MIN_PIECE_SIZE, MAX_PIECE_SIZE) * PIECE_ASPECT,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      angle: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-MAX_SPIN, MAX_SPIN),
      flutter: randomBetween(0, Math.PI * 2),
    };
  });
}

/** 쏘아 올린 조각만 중력과 공기 저항을 받아 움직인다 */
function stepPieces(pieces: Piece[], elapsed: number, delta: number, size: CanvasSize): void {
  const gravity = GRAVITY * (size.height / REFERENCE_HEIGHT);
  const drag = Math.max(1 - AIR_DRAG * delta, 0);
  for (const piece of pieces) {
    if (elapsed < piece.launchAt) continue;
    piece.velocityX *= drag;
    piece.velocityY = piece.velocityY * drag + gravity * delta;
    piece.x += piece.velocityX * delta;
    piece.y += piece.velocityY * delta;
    piece.angle += piece.spin * delta;
  }
}

/** 조각은 납작한 사각형이고, 뒤집히듯 세로 길이가 출렁인다 */
function drawPieces(context: CanvasRenderingContext2D, pieces: readonly Piece[], elapsed: number, alpha: number): void {
  context.globalAlpha = alpha;
  for (const piece of pieces) {
    if (elapsed < piece.launchAt) continue;
    const flip = Math.abs(Math.cos(piece.flutter + elapsed * FLUTTER_SPEED));
    context.save();
    context.translate(piece.x, piece.y);
    context.rotate(piece.angle);
    context.fillStyle = piece.color;
    context.fillRect(-piece.width / 2, (-piece.height * flip) / 2, piece.width, piece.height * flip);
    context.restore();
  }
}

/** 움직임을 줄인 화면용: 몇 번에 나눠 터지는 조각까지 모두 한꺼번에, 터진 직후 자리에 한 번만 그린다 */
function drawStillBurst(context: CanvasRenderingContext2D, pieces: Piece[]): void {
  for (const piece of pieces) {
    piece.launchAt = 0;
    piece.x += piece.velocityX * STILL_SPREAD_TIME;
    piece.y += piece.velocityY * STILL_SPREAD_TIME;
  }
  drawPieces(context, pieces, STILL_SPREAD_TIME, 1);
}

/** 끝나기 직전 FADE_TIME 동안 흐려진다 */
function getFade(elapsed: number, duration: number): number {
  return Math.min((duration - elapsed) / FADE_TIME, 1);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const MS_PER_SECOND = 1000;
/** 탭이 뒤로 갔다 오면 한 번에 멀리 날아가지 않게 프레임 시간을 자른다 */
const MAX_FRAME_DELTA = 0.05;
/** 속도·중력 수치를 맞춘 기준 화면 높이(390×844) */
const REFERENCE_HEIGHT = 844;
const ORIGIN_Y = 0.45;
const WAVE_ORIGINS_X = [0.5, 0.25, 0.75] as const;
const WAVE_GAP = 0.55;
/** 위쪽을 중심으로 좌우로 퍼지는 각도(라디안) */
const LAUNCH_SPREAD = 0.85;
const MIN_SPEED = 380;
const MAX_SPEED = 900;
const GRAVITY = 950;
const AIR_DRAG = 1.6;
const MIN_PIECE_SIZE = 7;
const MAX_PIECE_SIZE = 12;
const PIECE_ASPECT = 0.6;
const MAX_SPIN = 9;
const FLUTTER_SPEED = 7;
const FADE_TIME = 0.6;
const STILL_SPREAD_TIME = 0.35;
const CONFETTI_COLORS = ['#ff5c9a', '#ffd166', '#8fd694', '#9ecbff', '#d4c2ff', '#ff8a5c', '#ffffff'] as const;

// ── 모양 ─────────────────────────────────────────────────────

const OVERLAY_Z_INDEX = 10;
const STAGE_SIZE = 340;
const STAGE_VIEWPORT_RATIO = 86;
const NAME_FONT_SIZE = 40;
const WIN_FONT_SIZE = 28;
const COMPLETE_FONT_SIZE = 38;
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

const overlay = css`
  position: fixed;
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

const confettiCanvas = css`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const stage = css`
  position: relative;
  display: block;
  width: min(${STAGE_VIEWPORT_RATIO}vw, ${STAGE_SIZE}px);
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
