import { Clone, useGLTF } from '@react-three/drei';
import { Component, Suspense, useMemo, type ReactElement, type ReactNode } from 'react';
import {
  Box3,
  ConeGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Object3D,
  type Vector3Tuple,
} from 'three';
import { PLACEHOLDER_CORE_RADIUS, PLACEHOLDER_HEAD_RADIUS, PLACEHOLDER_HEAD_Y } from '../config/dollCatalog';
import type { DollKind, PlaceholderLook } from '../game/types';

export interface DollModelProps {
  kind: DollKind;
}

/**
 * 인형 하나의 생김새. kind.scale 을 모양 전체에 곱한다(충돌 도형에는 Doll.tsx 가 같은 배율을 따로 곱한다).
 * kind.modelUrl 이 있으면 그 .glb 를 그린다. 모델이 없거나, 읽는 동안이거나, 읽지 못했을 때(없는 파일, 깨진 파일)는
 * placeholder.look 에 따른 임시 도형을 그린다. 모델을 읽지 못해도 그 인형 하나만 임시 도형이 되고 게임은 계속된다.
 *
 * 크기 단위 규칙(docs/dolls.md 에 같은 내용을 풀어 두었다)
 * - scale 을 곱하기 전 단위를 "표준 크기"라 한다. 임시 인형은 이 단위로 높이 약 1.5(몸통 아래 끝 -0.5 ~ 머리 끝 약 1.0)다.
 * - .glb 모델은 파일 안의 원래 크기·원점과 상관없이 바운딩 박스를 재서 높이를 STANDARD_MODEL_HEIGHT 로 맞추고,
 *   바닥 가운데를 몸통 공(원점, 반지름 coreRadius)의 아래 끝에 둔다. 파일은 위가 +Y 이기만 하면 된다.
 * - coreRadius 와 충돌 도형 치수도 표준 크기 단위로 적는다. 그 위에 scale 을 모양과 충돌 도형에 함께 곱해 실물 크기 비율을 낸다.
 *   축하 화면(DollStage)도 이 표준 크기를 기준으로 인형을 화면 가운데에 맞춘다.
 */
export function DollModel({ kind }: DollModelProps): ReactElement {
  return (
    <group scale={kind.scale}>
      <DollShape kind={kind} />
    </group>
  );
}

function DollShape({ kind }: DollModelProps): ReactElement {
  const placeholder = <PlaceholderShape look={kind.placeholder.look} color={kind.placeholder.color} />;
  if (kind.modelUrl === null) return placeholder;

  return (
    <ModelBoundary fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <GltfShape url={resolveModelUrl(kind.modelUrl)} coreRadius={kind.coreRadius} />
      </Suspense>
    </ModelBoundary>
  );
}

/** 주소 맨 앞의 / */
const LEADING_SLASH = /^\//;

/**
 * 카탈로그의 modelUrl(public/ 아래 상대 경로, 예: `dolls/rabbit.glb`)을 실제로 읽을 주소로 바꾼다. 모델 주소는 여기서만 만든다.
 * 앱이 놓인 경로(import.meta.env.BASE_URL) 뒤에 붙여, 빌드 결과물을 하위 경로에 올려도 그 아래의 dolls/ 를 읽는다.
 * 앞에 / 를 붙여 적었어도 같은 주소가 된다.
 */
function resolveModelUrl(modelUrl: string): string {
  return `${import.meta.env.BASE_URL}${modelUrl.replace(LEADING_SLASH, '')}`;
}

/** .glb 모델을 맞추는 높이(표준 크기 단위). 임시 인형 곰의 높이(약 1.55)와 같은 크기다. */
const STANDARD_MODEL_HEIGHT = 1.5;

interface GltfShapeProps {
  url: string;
  coreRadius: number;
}

/**
 * .glb 모델 하나. 읽은 장면은 주소마다 한 번만 읽어 두고 게임 화면과 축하 화면이 같이 쓰므로, 인형마다 복제(Clone)해서 그린다.
 * 복제본은 도형·재질을 원본과 나눠 쓴다. dispose={null} 로, 이 인형이 빠질 때(뽑혀 사라질 때, 축하 화면을 닫을 때)
 * 다른 인형과 다른 캔버스가 아직 쓰는 도형·재질을 지우지 않게 한다.
 */
function GltfShape({ url, coreRadius }: GltfShapeProps): ReactElement {
  const { scene } = useGLTF(url);
  const fit = useMemo((): ModelFit => fitToStandardSize(scene, coreRadius), [scene, coreRadius]);

  return (
    <group dispose={null} position={fit.position} scale={fit.scale}>
      <Clone object={scene} castShadow />
    </group>
  );
}

/** 모델을 표준 크기에 맞추는 배율과 옮길 자리 */
interface ModelFit {
  scale: number;
  position: Vector3Tuple;
}

/** 바운딩 박스로 높이를 STANDARD_MODEL_HEIGHT 에 맞추고, 바닥 가운데가 몸통 공 아래 끝(y = -coreRadius)에 오게 옮긴다 */
function fitToStandardSize(scene: Object3D, coreRadius: number): ModelFit {
  const box = new Box3().setFromObject(scene);
  const height = box.max.y - box.min.y;
  // 그릴 도형이 없거나 납작한 파일은 크기를 잴 수 없어 원래 크기 그대로 바닥만 맞춘다
  if (box.isEmpty() || height <= 0) return { scale: 1, position: [0, -coreRadius, 0] };

  const scale = STANDARD_MODEL_HEIGHT / height;
  const center = box.getCenter(new Vector3());
  return { scale, position: [-center.x * scale, -coreRadius - box.min.y * scale, -center.z * scale] };
}

interface ModelBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ModelBoundaryState {
  hasFailed: boolean;
}

/** 모델을 읽지 못하면 이 인형만 임시 도형으로 바꾼다. 오류가 캔버스나 게임 전체로 번지지 않는다. */
class ModelBoundary extends Component<ModelBoundaryProps, ModelBoundaryState> {
  state: ModelBoundaryState = { hasFailed: false };

  static getDerivedStateFromError(): ModelBoundaryState {
    return { hasFailed: true };
  }

  render(): ReactNode {
    if (this.state.hasFailed) return this.props.fallback;
    return this.props.children;
  }
}

interface PlaceholderShapeProps {
  look: PlaceholderLook;
  color: string;
}

/** 코드로 만든 임시 인형: 몸통 공, 머리 공, 얼굴, 종류마다 다른 귀 */
function PlaceholderShape({ look, color }: PlaceholderShapeProps): ReactElement {
  const furMaterial = getFurMaterial(color);
  const headParts = [...FACE_PARTS, ...EAR_PARTS[look]];

  return (
    <>
      <mesh geometry={SPHERE} material={furMaterial} scale={PLACEHOLDER_CORE_RADIUS} castShadow />
      {/* 머리 묶음 안의 치수는 머리 반지름을 1로 본 값이다 */}
      <group position={[0, PLACEHOLDER_HEAD_Y, 0]} scale={PLACEHOLDER_HEAD_RADIUS}>
        <mesh geometry={SPHERE} material={furMaterial} castShadow />
        {headParts.map((part, index) => (
          <mesh
            key={index}
            geometry={GEOMETRY_BY_SHAPE[part.shape]}
            material={part.paint === 'fur' ? furMaterial : PAINT_MATERIALS[part.paint]}
            position={part.position}
            rotation={[0, 0, part.tiltZ ?? 0]}
            scale={part.size}
            castShadow={part.paint === 'fur'}
          />
        ))}
      </group>
    </>
  );
}

type PartShape = 'sphere' | 'cone';
type PartPaint = 'fur' | 'face' | 'eyeWhite' | 'accent';

/** 머리에 붙는 작은 도형 하나. 원뿔의 size 는 [반지름, 높이, 반지름] 이다. */
interface HeadPart {
  shape: PartShape;
  paint: PartPaint;
  position: Vector3Tuple;
  size: Vector3Tuple;
  /** z축 기울기(라디안). mirrored 로 만든 짝은 둘 다 바깥쪽으로 기울도록 부호가 정해진다. */
  tiltZ?: number;
}

const SPHERE_WIDTH_SEGMENTS = 24;
const SPHERE_HEIGHT_SEGMENTS = 16;
const CONE_RADIAL_SEGMENTS = 16;
const SPHERE = new SphereGeometry(1, SPHERE_WIDTH_SEGMENTS, SPHERE_HEIGHT_SEGMENTS);
const CONE = new ConeGeometry(1, 1, CONE_RADIAL_SEGMENTS);
const GEOMETRY_BY_SHAPE: Record<PartShape, BufferGeometry> = { sphere: SPHERE, cone: CONE };

const FUR_ROUGHNESS = 0.9;
const FACE_COLOR = '#3a2030';
const EYE_WHITE_COLOR = '#ffffff';
const ACCENT_COLOR = '#ff8a5c';
const PAINT_MATERIALS: Record<Exclude<PartPaint, 'fur'>, MeshStandardMaterial> = {
  face: new MeshStandardMaterial({ color: FACE_COLOR }),
  eyeWhite: new MeshStandardMaterial({ color: EYE_WHITE_COLOR }),
  accent: new MeshStandardMaterial({ color: ACCENT_COLOR, roughness: FUR_ROUGHNESS }),
};

/** 같은 색 인형끼리 재질 하나를 나눠 쓴다 */
const furMaterials = new Map<string, MeshStandardMaterial>();

function getFurMaterial(color: string): MeshStandardMaterial {
  const cached = furMaterials.get(color);
  if (cached !== undefined) return cached;

  const material = new MeshStandardMaterial({ color, roughness: FUR_ROUGHNESS });
  furMaterials.set(color, material);
  return material;
}

function ballSize(radius: number): Vector3Tuple {
  return [radius, radius, radius];
}

/** 오른쪽 도형 하나로 좌우 한 쌍을 만든다 */
function mirrored(part: HeadPart): HeadPart[] {
  const [x, y, z] = part.position;
  const tiltZ = part.tiltZ ?? 0;
  return [
    { ...part, position: [-x, y, z], tiltZ },
    { ...part, position: [x, y, z], tiltZ: -tiltZ },
  ];
}

/** 모든 종류가 같이 쓰는 얼굴: 눈 두 개와 코 */
const FACE_PARTS: readonly HeadPart[] = [
  ...mirrored({ shape: 'sphere', paint: 'face', position: [0.36, 0.17, 0.89], size: ballSize(0.125) }),
  { shape: 'sphere', paint: 'face', position: [0, -0.11, 0.97], size: ballSize(0.14) },
];

/** 종류마다 다른 귀 자리: 둥근 귀, 긴 귀, 뾰족 귀, 볏, 큰 눈 */
const EAR_PARTS: Record<PlaceholderLook, readonly HeadPart[]> = {
  bear: mirrored({ shape: 'sphere', paint: 'fur', position: [0.72, 0.83, 0], size: ballSize(0.36) }),
  bunny: mirrored({ shape: 'sphere', paint: 'fur', position: [0.35, 1.45, 0], size: [0.22, 0.8, 0.16], tiltZ: 0.2 }),
  cat: mirrored({ shape: 'cone', paint: 'fur', position: [0.55, 0.9, 0], size: [0.33, 0.6, 0.33], tiltZ: 0.45 }),
  chick: [
    { shape: 'cone', paint: 'accent', position: [0, 1.25, 0], size: [0.22, 0.7, 0.22] },
    ...mirrored({ shape: 'cone', paint: 'accent', position: [0.25, 1.12, 0], size: [0.17, 0.5, 0.17], tiltZ: 0.45 }),
  ],
  frog: [
    ...mirrored({ shape: 'sphere', paint: 'fur', position: [0.5, 0.75, 0.25], size: ballSize(0.38) }),
    ...mirrored({ shape: 'sphere', paint: 'eyeWhite', position: [0.5, 0.8, 0.45], size: ballSize(0.28) }),
    ...mirrored({ shape: 'sphere', paint: 'face', position: [0.5, 0.82, 0.7], size: ballSize(0.14) }),
  ],
};
