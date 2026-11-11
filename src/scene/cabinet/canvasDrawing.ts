import { CanvasTexture, SRGBColorSpace } from 'three';
import { DESIGN_TOKENS } from '../../theme/tokens';

/*
 * 기계 장식 텍스처를 캔버스에 직접 그리는 도구. 새 의존성 없이 512px 이하 캔버스에 손그림처럼 그린다.
 * 선은 모두 따뜻한 갈색이고, 모서리와 끝은 둥글게 맺는다.
 */

/** 텍스처 한 장의 가로·세로 최대 크기(px). 폰 메모리를 아끼려고 넘지 않는다. */
export const MAX_TEXTURE_SIZE = 512;

/** 비스듬히 보이는 바닥·벽도 흐려지지 않게 하는 이방성 필터 정도(기기 최대치를 넘으면 three 가 줄인다) */
const ANISOTROPY = 4;

export type Painter = (context: CanvasRenderingContext2D, width: number, height: number) => void;

/** 크기를 정한 캔버스에 painter 로 그려 텍스처를 만든다. 다시 그릴 때는 repaintTexture 를 쓴다. */
export function createPaintedTexture(width: number, height: number, painter: Painter): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(width, MAX_TEXTURE_SIZE);
  canvas.height = Math.min(height, MAX_TEXTURE_SIZE);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  repaintTexture(texture, painter);
  return texture;
}

/** 캔버스를 비우고 painter 로 다시 그린 뒤 GPU 에 다시 올리게 한다 */
export function repaintTexture(texture: CanvasTexture, painter: Painter): void {
  const canvas = texture.image;
  const context = canvas.getContext('2d');
  if (context === null) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  painter(context, canvas.width, canvas.height);
  context.restore();
  texture.needsUpdate = true;
}

/** 갈색 펜 선 설정 */
export function setPen(context: CanvasRenderingContext2D, width: number, color: string = DESIGN_TOKENS.color.line): void {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineJoin = 'round';
  context.lineCap = 'round';
}

/**
 * 모서리가 둥근 사각형. wobble 만큼 변 가운데를 살짝 부풀리거나 오목하게 해서 자로 그은 선이 아니라 펜으로 그은 선처럼 보이게 한다.
 * wobble 은 [위, 오른쪽, 아래, 왼쪽] 변의 부풂(px, 바깥이 +)이다.
 */
export function traceSoftRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  wobble: readonly [number, number, number, number] = [0, 0, 0, 0],
): void {
  const [top, right, bottom, left] = wobble;
  const right0 = x + width;
  const bottom0 = y + height;
  const middleX = x + width / 2;
  const middleY = y + height / 2;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.quadraticCurveTo(middleX, y - top * 2, right0 - radius, y);
  context.quadraticCurveTo(right0, y, right0, y + radius);
  context.quadraticCurveTo(right0 + right * 2, middleY, right0, bottom0 - radius);
  context.quadraticCurveTo(right0, bottom0, right0 - radius, bottom0);
  context.quadraticCurveTo(middleX, bottom0 + bottom * 2, x + radius, bottom0);
  context.quadraticCurveTo(x, bottom0, x, bottom0 - radius);
  context.quadraticCurveTo(x - left * 2, middleY, x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

/** 끝이 둥근 다섯 꼭지 별. 꼭짓점을 조금씩 어긋나게 해 손그림처럼 보인다. */
export function traceStar(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
  context.beginPath();
  for (let index = 0; index < STAR_POINTS * 2; index += 1) {
    const isTip = index % 2 === 0;
    const reach = radius * (isTip ? 1 : STAR_INNER_RATIO) * (1 + STAR_JITTER[index % STAR_JITTER.length]);
    const angle = -Math.PI / 2 + (index * Math.PI) / STAR_POINTS;
    const pointX = centerX + Math.cos(angle) * reach;
    const pointY = centerY + Math.sin(angle) * reach;
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.closePath();
}

/** 통통한 하트. size 는 대략 가로 폭이다. */
export function traceHeart(context: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
  const half = size / 2;
  const top = centerY - half * HEART_TOP_RATIO;
  const tipY = centerY + half * HEART_TIP_RATIO;
  const { bulgeX, bulgeY, shoulderX, shoulderY, lobeX, lobeY, notchX, notchY, dipY } = HEART_CURVE;
  context.beginPath();
  context.moveTo(centerX, tipY);
  context.bezierCurveTo(centerX - half * bulgeX, centerY + half * bulgeY, centerX - half * shoulderX, top - half * shoulderY, centerX - half * lobeX, top - half * lobeY);
  context.bezierCurveTo(centerX - half * notchX, top - half * notchY, centerX, top - half * dipY, centerX, top);
  context.bezierCurveTo(centerX, top - half * dipY, centerX + half * notchX, top - half * notchY, centerX + half * lobeX, top - half * lobeY);
  context.bezierCurveTo(centerX + half * shoulderX, top - half * shoulderY, centerX + half * bulgeX, centerY + half * bulgeY, centerX, tipY);
  context.closePath();
}

/**
 * 아래가 평평하고 위가 몽글한 구름을 칠하고 바깥 둘레에만 선을 긋는다. width 는 구름 폭, baseY 는 구름 바닥 높이다.
 * 덩어리마다 두 배 굵기로 선을 그은 뒤 그 위를 모두 칠해서, 겹친 안쪽 선은 덮이고 바깥 둘레 선만 남는다.
 */
export function paintCloud(
  context: CanvasRenderingContext2D,
  centerX: number,
  baseY: number,
  width: number,
  lineWidth: number,
  lineColor: string,
): void {
  const unit = width / CLOUD_UNITS;
  const traceAll = (): void => {
    context.beginPath();
    for (const [offsetX, offsetY, radius] of CLOUD_PUFFS) {
      context.moveTo(centerX + (offsetX + radius) * unit, baseY + offsetY * unit);
      context.arc(centerX + offsetX * unit, baseY + offsetY * unit, radius * unit, 0, Math.PI * 2);
    }
    // 바닥 알약: 양 끝이 반원이다
    const endRadius = (CLOUD_BASE_HEIGHT / 2) * unit;
    const leftEnd = centerX - CLOUD_BASE_HALF * unit + endRadius;
    const rightEnd = centerX + CLOUD_BASE_HALF * unit - endRadius;
    const middleY = baseY - endRadius;
    context.moveTo(leftEnd, middleY - endRadius);
    context.lineTo(rightEnd, middleY - endRadius);
    context.arc(rightEnd, middleY, endRadius, -Math.PI / 2, Math.PI / 2);
    context.lineTo(leftEnd, middleY + endRadius);
    context.arc(leftEnd, middleY, endRadius, Math.PI / 2, (Math.PI * 3) / 2);
    context.closePath();
  };
  setPen(context, lineWidth * 2, lineColor);
  traceAll();
  context.stroke();
  context.fillStyle = DESIGN_TOKENS.color.cream;
  traceAll();
  context.fill();
}

/** 네 갈래 반짝이 */
export function traceSparkle(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
  const waist = radius * SPARKLE_WAIST_RATIO;
  context.beginPath();
  context.moveTo(centerX, centerY - radius);
  context.quadraticCurveTo(centerX + waist, centerY - waist, centerX + radius, centerY);
  context.quadraticCurveTo(centerX + waist, centerY + waist, centerX, centerY + radius);
  context.quadraticCurveTo(centerX - waist, centerY + waist, centerX - radius, centerY);
  context.quadraticCurveTo(centerX - waist, centerY - waist, centerX, centerY - radius);
  context.closePath();
}

const STAR_POINTS = 5;
const STAR_INNER_RATIO = 0.48;
/** 꼭짓점마다 반지름을 조금씩 다르게 한 비율 */
const STAR_JITTER = [0.02, -0.03, -0.04, 0.02, 0.03, 0, -0.02, 0.04, 0.01, -0.02] as const;
const HEART_TOP_RATIO = 0.35;
const HEART_TIP_RATIO = 0.95;
/** 하트 한쪽 곡선의 조절점: 아래 볼록, 어깨, 둥근 봉우리, 가운데 오목한 곳(하트 반폭에 대한 비율, 손으로 맞춘 값) */
const HEART_CURVE = {
  bulgeX: 1.2,
  bulgeY: 0.2,
  shoulderX: 1.1,
  shoulderY: 0.55,
  lobeX: 0.5,
  lobeY: 0.5,
  notchX: 0.15,
  notchY: 0.48,
  dipY: 0.2,
} as const;
const SPARKLE_WAIST_RATIO = 0.18;
/** 구름 폭을 나눈 칸 수와, 칸 단위로 적은 몽글한 덩어리들 [가운데 x, 가운데 y(바닥 기준), 반지름] (왼쪽부터) */
const CLOUD_UNITS = 9;
const CLOUD_PUFFS = [
  [-2.9, -1.0, 1.25],
  [-1.2, -1.9, 1.6],
  [0.9, -2.1, 1.85],
  [2.9, -1.2, 1.35],
] as const;
/** 구름 바닥을 이루는 납작한 알약: 가로 절반, 높이(칸) */
const CLOUD_BASE_HALF = 4.1;
const CLOUD_BASE_HEIGHT = 1.6;
