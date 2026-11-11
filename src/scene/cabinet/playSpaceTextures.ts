import { RepeatWrapping, type CanvasTexture } from 'three';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { createPaintedTexture, paintCloud, traceSoftRect, traceSparkle, setPen } from './canvasDrawing';

/*
 * 놀이 공간 안쪽 텍스처: 구름을 그린 하늘 뒷벽, 점무늬 민트 바닥, 크림 테두리의 갈색 배출구, 기계 발치의 옅은 그림자.
 * 모두 처음 쓸 때 한 번만 그린다.
 */

const { color } = DESIGN_TOKENS;

/** 뒷벽 안쪽 면(가로 6 × 세로 7)에 맞춘 캔버스 크기. 1 단위가 64px 이다. */
const WALL_CANVAS_WIDTH = 384;
const WALL_CANVAS_HEIGHT = 448;
/** 뒷벽 그림은 배경막이라 옅은 선으로 그려 앞의 집게와 인형보다 한 걸음 뒤로 물러나 보이게 한다 */
const WALL_LINE_WIDTH = 3;
/** 뒷벽 구름 [가운데 x, 바닥 y, 폭](px). 인형이 쌓이는 아래쪽 1/3 은 비워 둔다. */
const WALL_CLOUDS = [
  [92, 122, 112],
  [304, 204, 96],
  [186, 290, 70],
] as const;
/** 뒷벽 반짝이 [x, y, 반지름](px) */
const WALL_SPARKLES = [
  [214, 70, 9],
  [48, 220, 7],
] as const;

export function createSkyWallTexture(): CanvasTexture {
  return createPaintedTexture(WALL_CANVAS_WIDTH, WALL_CANVAS_HEIGHT, (context, width, height): void => {
    // 바깥 하늘(하늘색 → 크림색)보다 한 톤 깊게 시작해 기계 안쪽이 무대 배경막으로 읽힌다
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, color.skyDeep);
    sky.addColorStop(1, color.sky);
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    for (const [centerX, baseY, cloudWidth] of WALL_CLOUDS) {
      paintCloud(context, centerX, baseY, cloudWidth, WALL_LINE_WIDTH, color.lineSoft);
    }
    setPen(context, WALL_LINE_WIDTH, color.lineSoft);
    context.fillStyle = color.butter;
    for (const [centerX, centerY, radius] of WALL_SPARKLES) {
      traceSparkle(context, centerX, centerY, radius);
      context.fill();
      context.stroke();
    }
  });
}

/** 바닥 무늬 한 칸(px)과, 바닥 한 변(6)에 되풀이하는 수 */
const FLOOR_TILE = 128;
const FLOOR_REPEAT = 4;
const FLOOR_DOT_RADIUS = 9;
const FLOOR_DOT_ALPHA = 0.6;
/** 한 칸 안의 점 두 개: 엇갈려 놓아 줄무늬처럼 보이지 않는다 */
const FLOOR_DOTS = [
  [FLOOR_TILE * 0.25, FLOOR_TILE * 0.25],
  [FLOOR_TILE * 0.75, FLOOR_TILE * 0.75],
] as const;

export function createFloorTexture(): CanvasTexture {
  const texture = createPaintedTexture(FLOOR_TILE, FLOOR_TILE, (context, width, height): void => {
    context.fillStyle = color.mint;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = FLOOR_DOT_ALPHA;
    context.fillStyle = color.cream;
    for (const [dotX, dotY] of FLOOR_DOTS) {
      context.beginPath();
      context.arc(dotX, dotY, FLOOR_DOT_RADIUS, 0, Math.PI * 2);
      context.fill();
    }
  });
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(FLOOR_REPEAT, FLOOR_REPEAT);
  return texture;
}

/** 배출구 바닥 캔버스(정사각형)와 크림 테두리 폭, 구멍 모서리 둥글기(px) */
const CHUTE_CANVAS = 128;
const CHUTE_RIM = 15;
const CHUTE_HOLE_RADIUS = 16;
const CHUTE_LINE_WIDTH = 3;
/** 구멍 위쪽 가장자리에서 아래로 옅어지는 그늘 깊이(구멍 높이에 대한 비율) */
const CHUTE_SHADE_DEPTH = 0.45;

export function createChuteTexture(): CanvasTexture {
  return createPaintedTexture(CHUTE_CANVAS, CHUTE_CANVAS, (context, width, height): void => {
    context.fillStyle = color.cream;
    context.fillRect(0, 0, width, height);
    const holeSize = width - CHUTE_RIM * 2;
    traceSoftRect(context, CHUTE_RIM, CHUTE_RIM, holeSize, holeSize, CHUTE_HOLE_RADIUS, [0.5, -0.5, 0.8, -0.3]);
    context.fillStyle = color.chuteHole;
    context.fill();
    const shade = context.createLinearGradient(0, CHUTE_RIM, 0, CHUTE_RIM + holeSize * CHUTE_SHADE_DEPTH);
    shade.addColorStop(0, color.shadowStrong);
    shade.addColorStop(1, color.shadowClear);
    context.fillStyle = shade;
    context.fill();
    setPen(context, CHUTE_LINE_WIDTH);
    context.stroke();
    // 바깥 테두리: 바닥과 만나는 경계
    context.strokeRect(CHUTE_LINE_WIDTH / 2, CHUTE_LINE_WIDTH / 2, width - CHUTE_LINE_WIDTH, height - CHUTE_LINE_WIDTH);
  });
}

const SHADOW_CANVAS = 128;
/** 그림자가 진한 채로 이어지는 안쪽 비율. 기계 발치 둘레까지 진하고 그 바깥에서 사라진다. */
const SHADOW_SOLID_RATIO = 0.62;

/** 가운데가 진하고 가장자리로 갈수록 사라지는 둥근 그림자 */
export function createGroundShadowTexture(): CanvasTexture {
  return createPaintedTexture(SHADOW_CANVAS, SHADOW_CANVAS, (context, width, height): void => {
    const half = width / 2;
    const fade = context.createRadialGradient(half, height / 2, 0, half, height / 2, half);
    fade.addColorStop(0, color.shadowStrong);
    fade.addColorStop(SHADOW_SOLID_RATIO, color.shadowStrong);
    fade.addColorStop(1, color.shadowClear);
    context.fillStyle = fade;
    context.fillRect(0, 0, width, height);
  });
}
