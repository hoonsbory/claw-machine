import type { CanvasTexture } from 'three';
import { getStickerKindId } from '../../config/stickers';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { createPaintedTexture, repaintTexture, traceSoftRect, traceStar, setPen, type Painter } from './canvasDrawing';

/*
 * 아래 몸통 앞면에 붙이는 그림: 배출구 아래 경품 문, 둥근 장식 단추 받침, 별 몇 개, 인형 스티커, 위아래 바느질 선.
 * 캔버스 좌표는 판(가로 BODY_DECAL_WIDTH 단위)의 왼쪽 위가 0 이고, 1 단위가 DECAL_PX_PER_UNIT px 이다.
 * 스티커 그림은 늦게 오므로 처음에는 스티커 없이 그리고, 그림이 오면 repaintBodyDecal 로 같은 텍스처에 다시 그린다(그리기 수는 그대로).
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
/** 별 [가운데 x, 가운데 y, 반지름](단위). 아래쪽 넓은 면의 스티커 사이사이에 흩어 둔다. */
const STARS = [
  [2.3, 2.75, 0.3],
  [0.95, 4.75, 0.28],
  [3.95, 4.75, 0.26],
  [5.45, 2.7, 0.22],
] as const;

/**
 * 인형 스티커 자리: 가운데(단위)와 기울기(도). 자리 번호 순서대로 카탈로그 종류가 붙어(getStickerKindId) 다섯 종류가 모두 나온다.
 * 첫 자리는 경품 문과 단추 받침 사이, 나머지는 아래쪽 넓은 면에 지그재그로 둔다.
 */
const STICKER_SPOTS = [
  { centerX: 3.4, centerY: 1.3, tilt: -6 },
  { centerX: 0.85, centerY: 3.2, tilt: 5 },
  { centerX: 2.4, centerY: 4.45, tilt: -4 },
  { centerX: 3.95, centerY: 3.3, tilt: 7 },
  { centerX: 5.4, centerY: 4.4, tilt: -7 },
] as const;
/** 스티커 그림 한 변(단위). 기준 화면(390×844)에서 그림 한 변이 약 60px, 인형 키가 약 50px 로 보인다. */
const STICKER_WIDTH = 1.3;
/**
 * 카메라가 내려다봐서 몸통 앞면은 화면에서 세로로 약 1.35배 납작해 보인다(기준 화면에서 잰 값).
 * 스티커는 그만큼 세로로 늘려 그려 화면에서 제 비율로 보이게 한다.
 */
const VIEW_SQUASH_COMPENSATION = 1.35;

/** 몸통 앞면에 붙는 스티커 종류 id(자리 순서). 이 그림들을 읽어 repaintBodyDecal 에 넘긴다. */
export const BODY_STICKER_KIND_IDS: readonly string[] = STICKER_SPOTS.map((_, slot): string => getStickerKindId(slot));

/** 종류 id 로 찾는 읽어 둔 스티커 그림 */
export type StickerImages = ReadonlyMap<string, CanvasImageSource>;

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
const DEGREES_PER_HALF_TURN = 180;

export function createBodyDecalTexture(): CanvasTexture {
  return createPaintedTexture(toPx(BODY_DECAL_WIDTH), toPx(BODY_DECAL_HEIGHT), createBodyPainter(new Map()));
}

/** 스티커 그림이 오면 같은 앞면 그림에 스티커를 더해 다시 그린다. 받지 못한 종류의 자리는 비워 둔다. */
export function repaintBodyDecal(texture: CanvasTexture, stickers: StickerImages): void {
  repaintTexture(texture, createBodyPainter(stickers));
}

function createBodyPainter(stickers: StickerImages): Painter {
  return (context, width, height): void => {
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

    paintStickers(context, stickers);
  };
}

/** 스티커를 자리마다 살짝 기울여 붙인다 */
function paintStickers(context: CanvasRenderingContext2D, stickers: StickerImages): void {
  const size = toPx(STICKER_WIDTH);
  context.imageSmoothingQuality = 'high';
  STICKER_SPOTS.forEach(({ centerX, centerY, tilt }, slot): void => {
    const image = stickers.get(getStickerKindId(slot));
    if (image === undefined) return;
    context.save();
    context.translate(toPx(centerX), toPx(centerY));
    context.scale(1, VIEW_SQUASH_COMPENSATION);
    context.rotate((tilt * Math.PI) / DEGREES_PER_HALF_TURN);
    context.drawImage(image, -size / 2, -size / 2, size, size);
    context.restore();
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
