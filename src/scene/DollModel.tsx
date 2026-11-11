import type { ReactElement } from 'react';
import { ConeGeometry, MeshStandardMaterial, SphereGeometry, type BufferGeometry, type Vector3Tuple } from 'three';
import { PLACEHOLDER_CORE_RADIUS, PLACEHOLDER_HEAD_RADIUS, PLACEHOLDER_HEAD_Y } from '../config/dollCatalog';
import type { DollKind, PlaceholderLook } from '../game/types';

export interface DollModelProps {
  kind: DollKind;
}

/** 인형 하나의 생김새. 모델 파일 읽기는 아직 없어서 modelUrl 과 상관없이 placeholder.look 에 따른 임시 도형을 그린다. */
export function DollModel({ kind }: DollModelProps): ReactElement {
  const furMaterial = getFurMaterial(kind.placeholder.color);
  const headParts = [...FACE_PARTS, ...EAR_PARTS[kind.placeholder.look]];

  return (
    <group scale={kind.scale}>
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
    </group>
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
