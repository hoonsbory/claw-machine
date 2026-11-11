import {
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  Sphere,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DOLL_KINDS } from '../src/config/dollCatalog';
import { resolvePublicUrl } from '../src/config/publicUrl';
import type { DollKind } from '../src/game/types';
import { DESIGN_TOKENS } from '../src/theme/tokens';

/*
 * 스티커 만들기 페이지(tools/stickers.html)의 스크립트. 개발 서버에서만 돈다.
 * 카탈로그의 인형 모델을 하나씩 앞에서 조금 돌려 살짝 위에서 본 모습으로 그리고, 둘레에 크림색 테두리와 갈색 외곽선을 둘러
 * 오려 붙인 스티커처럼 만든다. 결과는 public/stickers/<id>.png 에 넣을 256px 투명 PNG 이고, 스티커마다 저장 링크가 붙는다.
 */

/** 스티커 한 변(px)과, 그 안에서 인형이 차지하는 비율(가로·세로 중 긴 쪽) */
const STICKER_SIZE = 256;
const DOLL_FILL = 0.8;
/** 인형 둘레의 크림색 테두리(스티커 한 변의 6%)와 그 바깥 갈색 외곽선 두께(px) */
const BORDER_WIDTH = Math.round(STICKER_SIZE * 0.06);
const OUTLINE_WIDTH = 3;
/** 테두리를 넓힐 때 찍는 고리 사이 간격(px). 1px 이면 가는 팔다리 안쪽도 빈틈없이 메운다. */
const STAMP_STEP = 1;
/** 크게 그린 뒤 줄여서 선이 매끈하다 */
const RENDER_SIZE = 768;
/** 이 알파값보다 진한 픽셀까지를 인형으로 보고 테두리 상자를 잰다 */
const ALPHA_THRESHOLD = 8;
/** 색 한 채널(0~255)을 이 간격으로 맞춰 PNG 를 약 70KB 아래로 줄인다 */
const COLOR_STEP = 4;
const MAX_CHANNEL = 255;

/** 정면에서 옆으로 돌린 각도와 내려다보는 각도 */
const TURN = MathUtils.degToRad(15);
const ELEVATION = MathUtils.degToRad(12);
const CAMERA_FOV = 25;
/** 모델을 감싼 구가 화면에 꼭 차지 않도록 띄우는 여유 */
const VIEW_MARGIN = 1.1;
/** 게임의 축하 화면(DollStage)과 같은 거의 흰 따뜻한 빛을 고르게, 앞에서 얼굴을 밝히는 빛과 반대편에서 그늘을 메우는 빛 */
const SKY_INTENSITY = 2.2;
const KEY_INTENSITY = 1.1;
const FILL_INTENSITY = 0.5;

const { cream, line, lightSky, lightGround } = DESIGN_TOKENS.color;

interface StickerResult {
  kind: DollKind;
  dataUrl: string;
}

const statusLine = getElement('status');
const saveAllButton = getElement('save-all');
const list = getElement('stickers');

void makeAllStickers();

async function makeAllStickers(): Promise<void> {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(RENDER_SIZE, RENDER_SIZE, false);
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = buildLitScene();
  const loader = new GLTFLoader();

  const results: StickerResult[] = [];
  for (const kind of DOLL_KINDS) {
    if (kind.modelUrl === null) continue;
    try {
      const { scene: model } = await loader.loadAsync(resolvePublicUrl(kind.modelUrl));
      const render = renderModel(renderer, scene, model);
      const dataUrl = paintDieCut(fitDoll(render)).toDataURL('image/png');
      results.push({ kind, dataUrl });
      showSticker(kind, dataUrl);
    } catch (error) {
      showFailure(kind, error);
    }
  }
  renderer.dispose();

  saveAllButton.addEventListener('click', (): void => {
    for (const link of list.querySelectorAll('a')) link.click();
  });
  saveAllButton.toggleAttribute('disabled', results.length === 0);
  statusLine.textContent = `${results.length}개를 그렸다. 저장한 <id>.png 를 public/stickers/ 에 넣는다.`;
  document.body.dataset.done = 'true';
}

function buildLitScene(): Scene {
  const scene = new Scene();
  scene.add(new HemisphereLight(lightSky, lightGround, SKY_INTENSITY));
  const key = new DirectionalLight(lightSky, KEY_INTENSITY);
  key.position.set(-1, 2, 4);
  const fill = new DirectionalLight(lightSky, FILL_INTENSITY);
  fill.position.set(2, 0.5, 3);
  scene.add(key, fill);
  return scene;
}

/** 모델을 돌려 세우고, 감싼 구가 화면에 들어오게 카메라를 살짝 위에서 앞으로 맞춰 그린다 */
function renderModel(renderer: WebGLRenderer, scene: Scene, model: Group): HTMLCanvasElement {
  const holder = new Group();
  holder.add(model);
  holder.rotation.y = TURN;
  scene.add(holder);

  const sphere = new Box3().setFromObject(holder).getBoundingSphere(new Sphere());
  const distance = (sphere.radius * VIEW_MARGIN) / Math.sin(MathUtils.degToRad(CAMERA_FOV / 2));
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, distance / 10, distance * 10);
  camera.position.set(
    sphere.center.x,
    sphere.center.y + Math.sin(ELEVATION) * distance,
    sphere.center.z + Math.cos(ELEVATION) * distance,
  );
  camera.lookAt(sphere.center);
  renderer.render(scene, camera);
  scene.remove(holder);
  return renderer.domElement;
}

/** 그린 인형을 알파 테두리 상자로 잘라, 긴 쪽이 스티커의 DOLL_FILL 이 되게 줄여 가운데에 놓는다 */
function fitDoll(render: HTMLCanvasElement): HTMLCanvasElement {
  const copy = createCanvas(render.width);
  const copyContext = get2d(copy, true);
  copyContext.drawImage(render, 0, 0);
  const bounds = measureAlphaBounds(copyContext.getImageData(0, 0, copy.width, copy.height));

  const doll = createCanvas(STICKER_SIZE);
  const context = get2d(doll);
  const scale = (STICKER_SIZE * DOLL_FILL) / Math.max(bounds.width, bounds.height);
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    copy,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    (STICKER_SIZE - width) / 2,
    (STICKER_SIZE - height) / 2,
    width,
    height,
  );
  return doll;
}

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function measureAlphaBounds(image: ImageData): Bounds {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error('그려진 인형이 없다(모델이 비었거나 화면 밖이다)');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** 인형 모양을 넓혀 갈색 외곽선, 그보다 덜 넓힌 크림색 테두리를 깔고 그 위에 인형을 놓는다 */
function paintDieCut(doll: HTMLCanvasElement): HTMLCanvasElement {
  const sticker = createCanvas(STICKER_SIZE);
  const context = get2d(sticker);
  stampAround(context, tintShape(doll, line), BORDER_WIDTH + OUTLINE_WIDTH);
  stampAround(context, tintShape(doll, cream), BORDER_WIDTH);
  context.drawImage(doll, 0, 0);
  quantizeColors(context);
  return sticker;
}

/** 색 단계를 조금 줄여 PNG 를 작게 만든다(눈으로는 차이가 거의 없다) */
function quantizeColors(context: CanvasRenderingContext2D): void {
  const image = context.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
  const { data } = image;
  for (let index = 0; index < data.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      data[index + channel] = Math.min(Math.round(data[index + channel] / COLOR_STEP) * COLOR_STEP, MAX_CHANNEL);
    }
  }
  context.putImageData(image, 0, 0);
}

/** 같은 모양을 한 가지 색으로 칠한 판 */
function tintShape(doll: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const shape = createCanvas(STICKER_SIZE);
  const context = get2d(shape);
  context.drawImage(doll, 0, 0);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = color;
  context.fillRect(0, 0, STICKER_SIZE, STICKER_SIZE);
  return shape;
}

/** 모양을 반지름 radius 안의 모든 방향으로 조금씩 옮겨 찍어, 둘레가 둥글게 radius 만큼 넓어진 모양을 만든다 */
function stampAround(context: CanvasRenderingContext2D, shape: HTMLCanvasElement, radius: number): void {
  context.drawImage(shape, 0, 0);
  for (let ring = radius; ring > 0; ring -= STAMP_STEP) {
    const steps = Math.ceil((2 * Math.PI * ring) / STAMP_STEP);
    for (let index = 0; index < steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2;
      context.drawImage(shape, Math.cos(angle) * ring, Math.sin(angle) * ring);
    }
  }
}

function showSticker(kind: DollKind, dataUrl: string): void {
  const figure = document.createElement('figure');
  const image = document.createElement('img');
  image.src = dataUrl;
  image.width = STICKER_SIZE;
  image.height = STICKER_SIZE;
  image.alt = kind.displayName;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${kind.id}.png`;
  link.textContent = `${kind.id}.png 저장 (${Math.round(dataUrlBytes(dataUrl) / 1024)} KB)`;
  const caption = document.createElement('figcaption');
  caption.append(link);
  figure.append(image, caption);
  list.append(figure);
}

function showFailure(kind: DollKind, error: unknown): void {
  const message = document.createElement('p');
  message.textContent = `${kind.id}: 그리지 못했다 (${error instanceof Error ? error.message : String(error)})`;
  list.append(message);
}

/** data URL 의 base64 부분을 실제 파일 크기로 바꾼다 */
function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

function createCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function get2d(canvas: HTMLCanvasElement, willReadFrequently = false): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently });
  if (context === null) throw new Error('2D 캔버스를 만들 수 없다');
  return context;
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`#${id} 가 stickers.html 에 없다`);
  return element;
}
