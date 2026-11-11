import type { CanvasTexture } from 'three';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { createPaintedTexture, repaintTexture, traceHeart, traceSoftRect, traceStar, setPen, type Painter } from './canvasDrawing';

/*
 * 기계 머리 장식 텍스처: 가운데 간판과 그 뒤로 뒷벽 윗변을 따라 늘어진 줄무늬 차양.
 * 캔버스 비율을 판 비율과 같게 잡아 원이 찌그러지지 않는다.
 */

const { color, font } = DESIGN_TOKENS;

/** 간판 글자. 하트와 별이 양옆에 붙는다. */
export const SIGN_TEXT = '인형뽑기';

/** 간판 캔버스(가로:세로 = 판 비율 3.2) */
export const SIGN_CANVAS_WIDTH = 512;
export const SIGN_CANVAS_HEIGHT = 160;
/** 판 둘레 여백, 둥글기, 테두리, 판 아래로 비치는 그림자 깊이(px) */
const SIGN_MARGIN_X = 8;
const SIGN_MARGIN_TOP = 8;
const SIGN_SHADOW_DEPTH = 9;
const SIGN_BOARD_RADIUS = 52;
const SIGN_LINE_WIDTH = 7;
/** 판 안쪽에 바느질한 듯한 점선 */
const SIGN_STITCH_INSET = 15;
const SIGN_STITCH_WIDTH = 4;
const SIGN_STITCH_DASH = [13, 10];
const SIGN_FONT_SIZE = 86;
/** Jua 는 굵기가 하나뿐이라 보통 굵기로 그린다(캔버스가 가짜 굵게를 만들지 않도록) */
const SIGN_FONT_WEIGHT = 400;
const SIGN_ORNAMENT_INSET = 62;
const SIGN_HEART_SIZE = 52;
const SIGN_STAR_RADIUS = 27;
const SIGN_ORNAMENT_LINE_WIDTH = 5;

/** 간판 판의 둥근 사각형 */
function traceBoard(context: CanvasRenderingContext2D, width: number, offsetY: number): void {
  const boardHeight = SIGN_CANVAS_HEIGHT - SIGN_MARGIN_TOP - SIGN_SHADOW_DEPTH - SIGN_MARGIN_X;
  traceSoftRect(
    context,
    SIGN_MARGIN_X,
    SIGN_MARGIN_TOP + offsetY,
    width - SIGN_MARGIN_X * 2,
    boardHeight,
    SIGN_BOARD_RADIUS,
    [1.5, -1, 2, -1.5],
  );
}

const paintSign: Painter = (context, width): void => {
  const boardHeight = SIGN_CANVAS_HEIGHT - SIGN_MARGIN_TOP - SIGN_SHADOW_DEPTH - SIGN_MARGIN_X;
  const centerY = SIGN_MARGIN_TOP + boardHeight / 2;

  // 판 아래로 살짝 비치는 갈색 그림자
  traceBoard(context, width, SIGN_SHADOW_DEPTH);
  context.fillStyle = color.shadow;
  context.fill();

  traceBoard(context, width, 0);
  context.fillStyle = color.butter;
  context.fill();
  setPen(context, SIGN_LINE_WIDTH);
  context.stroke();

  traceSoftRect(
    context,
    SIGN_MARGIN_X + SIGN_STITCH_INSET,
    SIGN_MARGIN_TOP + SIGN_STITCH_INSET,
    width - (SIGN_MARGIN_X + SIGN_STITCH_INSET) * 2,
    boardHeight - SIGN_STITCH_INSET * 2,
    SIGN_BOARD_RADIUS - SIGN_STITCH_INSET,
  );
  setPen(context, SIGN_STITCH_WIDTH, color.cream);
  context.setLineDash(SIGN_STITCH_DASH);
  context.stroke();
  context.setLineDash([]);

  // 글자는 실제 글자 모양의 위아래 끝으로 가운데를 맞춘다(글꼴마다 기준선 위치가 달라서)
  context.font = `${SIGN_FONT_WEIGHT} ${SIGN_FONT_SIZE}px ${font.family}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const metrics = context.measureText(SIGN_TEXT);
  const baselineY = centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  context.fillStyle = color.line;
  context.fillText(SIGN_TEXT, width / 2, baselineY);

  setPen(context, SIGN_ORNAMENT_LINE_WIDTH);
  context.fillStyle = color.coral;
  traceHeart(context, SIGN_ORNAMENT_INSET, centerY, SIGN_HEART_SIZE);
  context.fill();
  context.stroke();
  traceStar(context, width - SIGN_ORNAMENT_INSET, centerY, SIGN_STAR_RADIUS);
  context.fill();
  context.stroke();
};

export function createSignTexture(): CanvasTexture {
  return createPaintedTexture(SIGN_CANVAS_WIDTH, SIGN_CANVAS_HEIGHT, paintSign);
}

/** 화면 글꼴이 늦게 준비됐을 때 같은 간판을 다시 그린다 */
export function repaintSign(texture: CanvasTexture): void {
  repaintTexture(texture, paintSign);
}

/** 차양 캔버스(가로:세로 = 판 비율 16) */
export const AWNING_CANVAS_WIDTH = 512;
export const AWNING_CANVAS_HEIGHT = 32;
const AWNING_STRIPES = 12;
/** 줄무늬가 곧게 내려오는 깊이와 그 아래 물결 끝의 깊이(px) */
const AWNING_BAND_DEPTH = 16;
const AWNING_SCALLOP_DEPTH = 12;
const AWNING_LINE_WIDTH = 3;
const AWNING_SEAM_WIDTH = 1.5;

/** 차양 전체 모양: 위 가장자리에서 내려와 아래는 줄무늬마다 둥근 물결로 끝난다 */
function traceAwning(context: CanvasRenderingContext2D, width: number): void {
  const stripeWidth = width / AWNING_STRIPES;
  const inset = AWNING_LINE_WIDTH / 2;
  context.beginPath();
  context.moveTo(inset, inset);
  context.lineTo(width - inset, inset);
  context.lineTo(width - inset, AWNING_BAND_DEPTH);
  for (let index = AWNING_STRIPES - 1; index >= 0; index -= 1) {
    const left = Math.max(index * stripeWidth, inset);
    const right = Math.min((index + 1) * stripeWidth, width - inset);
    context.bezierCurveTo(
      right,
      AWNING_BAND_DEPTH + AWNING_SCALLOP_DEPTH * 1.3,
      left,
      AWNING_BAND_DEPTH + AWNING_SCALLOP_DEPTH * 1.3,
      left,
      AWNING_BAND_DEPTH,
    );
  }
  context.closePath();
}

const paintAwning: Painter = (context, width, height): void => {
  const stripeWidth = width / AWNING_STRIPES;
  traceAwning(context, width);
  context.save();
  context.clip();
  for (let index = 0; index < AWNING_STRIPES; index += 1) {
    context.fillStyle = index % 2 === 0 ? color.cream : color.peach;
    context.fillRect(index * stripeWidth, 0, stripeWidth, height);
  }
  setPen(context, AWNING_SEAM_WIDTH, color.lineSoft);
  for (let index = 1; index < AWNING_STRIPES; index += 1) {
    context.beginPath();
    context.moveTo(index * stripeWidth, 0);
    context.lineTo(index * stripeWidth, AWNING_BAND_DEPTH);
    context.stroke();
  }
  context.restore();
  setPen(context, AWNING_LINE_WIDTH);
  traceAwning(context, width);
  context.stroke();
};

export function createAwningTexture(): CanvasTexture {
  return createPaintedTexture(AWNING_CANVAS_WIDTH, AWNING_CANVAS_HEIGHT, paintAwning);
}
