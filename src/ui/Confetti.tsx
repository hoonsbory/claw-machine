import { css } from '@emotion/css';
import { useEffect, useRef, type ReactElement } from 'react';

/** 터지는 크기: 보통 획득, 5종을 다 채운 큰 축하 */
export type ConfettiBurstName = 'normal' | 'grand';

export interface ConfettiProps {
  burst: ConfettiBurstName;
  isReducedMotion: boolean;
}

/** 한 번의 축하에 터지는 색종이: 조각 수, 터지는 횟수, 전체 시간(초) */
interface ConfettiBurst {
  pieceCount: number;
  waveCount: number;
  duration: number;
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

/** 큰 축하는 색종이가 더 많고, 여러 번 나눠 터지며, 오래간다 */
const BURSTS: Record<ConfettiBurstName, ConfettiBurst> = {
  normal: { pieceCount: 90, waveCount: 1, duration: 2.6 },
  grand: { pieceCount: 260, waveCount: 4, duration: 5.5 },
};

/**
 * 부모를 가득 채운 2D 캔버스에 색종이를 쏘아 올린다. 새 의존성 없이 직접 움직이고, 시간이 다 되면 멈춘다.
 * 움직임을 줄인 화면에서는 터진 직후 모습 한 장만 그린다. 부모는 position 이 정해져 있어야 한다.
 */
export function Confetti({ burst, isReducedMotion }: ConfettiProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d') ?? null;
    if (canvas === null || context === null) return;

    const settings = BURSTS[burst];
    const size = fitToDisplay(canvas, context);
    const pieces = launchPieces(settings, size);
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
      if (elapsed >= settings.duration) return;

      stepPieces(pieces, elapsed, delta, size);
      drawPieces(context, pieces, elapsed, getFade(elapsed, settings.duration));
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

const MAX_PIXEL_RATIO = 2;
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

const confettiCanvas = css`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;
