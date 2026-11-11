import type { CanvasTexture } from 'three';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { createPaintedTexture, traceSoftRect, traceStar, setPen } from './canvasDrawing';

/*
 * 아래 몸통 앞면에 붙이는 그림: 배출구 아래 경품 문, 둥근 장식 단추 받침, 별 몇 개, 위아래 바느질 선.
 * 캔버스 좌표는 판(가로 BODY_DECAL_WIDTH 단위)의 왼쪽 위가 0 이고, 1 단위가 DECAL_PX_PER_UNIT px 이다.
 */

const { color } = DESIGN_TOKENS;

/** 붙이는 판 크기(단위). 몸통 앞면보다 둥근 모서리만큼 작다. */
export const BODY_DECAL_WIDTH = 6.2;
export const BODY_DECAL_HEIGHT = 5.6;
const DECAL_PX_PER_UNIT = 80;
const toPx = (units: number): number => units * DECAL_PX_PER_UNIT;

/** 경품 문: 판 왼쪽 위에서의 자리와 크기(단위) */
export const PRIZE_DOOR = { left: 0.2, top: 0.55, width: 2.0, height: 1.55 } as const;
/** 장식 단추 받침: 판 왼쪽 위에서 가운데까지(단위)와 반지름 */
export const BUTTON_PLATE = { centerX: 5.05, centerY: 1.32, radius: 0.5 } as const;
/** 별 [가운데 x, 가운데 y, 반지름](단위). 아래쪽 넓은 면에 흩어 둔다. */
const STARS = [
  [1.25, 3.85, 0.42],
  [3.35, 2.75, 0.24],
  [5.0, 3.95, 0.33],
  [2.75, 4.75, 0.18],
] as const;

const LINE_WIDTH = 5;
const DOOR_RADIUS = 0.24;
const FLAP_INSET = 0.2;
const FLAP_RADIUS = 0.16;
/** 문 손잡이: 덮개 위쪽 가운데의 짧은 막대 */
const HANDLE_WIDTH = 0.6;
const HANDLE_FROM_FLAP_TOP = 0.28;
const HANDLE_THICKNESS = 9;
/** 위아래 가장자리의 바느질 선: 가장자리에서의 거리(단위), 굵기·점선(px) */
const STITCH_INSET = 0.18;
const STITCH_WIDTH = 5;
const STITCH_DASH = [16, 12];

export function createBodyDecalTexture(): CanvasTexture {
  return createPaintedTexture(toPx(BODY_DECAL_WIDTH), toPx(BODY_DECAL_HEIGHT), (context, width, height): void => {
    setPen(context, STITCH_WIDTH, color.cream);
    context.setLineDash(STITCH_DASH);
    for (const stitchY of [toPx(STITCH_INSET), height - toPx(STITCH_INSET)]) {
      context.beginPath();
      context.moveTo(toPx(STITCH_INSET), stitchY);
      context.lineTo(width - toPx(STITCH_INSET), stitchY);
      context.stroke();
    }
    context.setLineDash([]);

    paintPrizeDoor(context);
    paintButtonPlate(context);

    setPen(context, LINE_WIDTH);
    context.fillStyle = color.butter;
    for (const [centerX, centerY, radius] of STARS) {
      traceStar(context, toPx(centerX), toPx(centerY), toPx(radius));
      context.fill();
      context.stroke();
    }
  });
}

/** 크림색 문틀 안에 진한 복숭아색 덮개와 갈색 손잡이 */
function paintPrizeDoor(context: CanvasRenderingContext2D): void {
  const { left, top, width, height } = PRIZE_DOOR;
  setPen(context, LINE_WIDTH);
  traceSoftRect(context, toPx(left), toPx(top), toPx(width), toPx(height), toPx(DOOR_RADIUS), [1, -1, 1.5, 0.5]);
  context.fillStyle = color.cream;
  context.fill();
  context.stroke();

  const flapTop = top + FLAP_INSET;
  traceSoftRect(
    context,
    toPx(left + FLAP_INSET),
    toPx(flapTop),
    toPx(width - FLAP_INSET * 2),
    toPx(height - FLAP_INSET * 2),
    toPx(FLAP_RADIUS),
    [-0.5, 1, -1, 0.5],
  );
  context.fillStyle = color.peachDeep;
  context.fill();
  context.stroke();

  setPen(context, HANDLE_THICKNESS);
  const handleY = toPx(flapTop + HANDLE_FROM_FLAP_TOP);
  const handleCenterX = toPx(left + width / 2);
  context.beginPath();
  context.moveTo(handleCenterX - toPx(HANDLE_WIDTH / 2), handleY);
  context.lineTo(handleCenterX + toPx(HANDLE_WIDTH / 2), handleY);
  context.stroke();
}

/** 3D 단추가 올라앉는 크림색 둥근 받침 */
function paintButtonPlate(context: CanvasRenderingContext2D): void {
  const { centerX, centerY, radius } = BUTTON_PLATE;
  setPen(context, LINE_WIDTH);
  context.beginPath();
  context.arc(toPx(centerX), toPx(centerY), toPx(radius), 0, Math.PI * 2);
  context.fillStyle = color.cream;
  context.fill();
  context.stroke();
}
