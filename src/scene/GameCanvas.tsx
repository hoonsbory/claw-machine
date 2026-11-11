import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useCallback, useLayoutEffect, useMemo, useRef, type ReactElement, type ReactNode } from 'react';
import { MathUtils, PerspectiveCamera, type Vector3Tuple } from 'three';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import type { DollInstance } from '../game/collection';
import { getCabinetLayout } from '../game/dollGeometry';
import { pickSpawnPoint } from '../game/spawn';
import type { DollKind, Vec3 } from '../game/types';
import { Cabinet } from './Cabinet';
import { Doll, type DollHandle } from './Doll';

export interface GameCanvasProps {
  instances: readonly DollInstance[];
  vanishingIds: ReadonlySet<string>;
  onVanished: (id: string) => void;
  /** Physics 안에 그려진다 */
  children?: ReactNode;
}

/** 3D 화면: 고정 카메라, 조명, 물리 세계 안의 기계와 인형 */
export function GameCanvas({ instances, vanishingIds, onVanished, children }: GameCanvasProps): ReactElement {
  const dollHandles = useRef(new Map<string, DollHandle>());
  const register = useCallback((id: string, handle: DollHandle | null): void => {
    if (handle === null) {
      dollHandles.current.delete(id);
      return;
    }
    dollHandles.current.set(id, handle);
  }, []);
  // 인형은 처음 그릴 때만 이 자리를 읽으므로 목록이 줄어 다시 계산해도 이미 있는 인형은 움직이지 않는다
  const spawnPoints = useMemo(
    (): Vec3[] => instances.map((_, index): Vec3 => pickSpawnPoint(index, CABINET_LAYOUT, GAME_CONFIG, Math.random)),
    [instances],
  );

  return (
    <Canvas shadows="percentage" flat dpr={[1, MAX_PIXEL_RATIO]}>
      <FixedCamera />
      <hemisphereLight args={[SKY_COLOR, GROUND_COLOR, SKY_INTENSITY]} />
      <directionalLight
        position={SUN_POSITION}
        intensity={SUN_INTENSITY}
        castShadow
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        shadow-camera-left={-SHADOW_CAMERA_HALF}
        shadow-camera-right={SHADOW_CAMERA_HALF}
        shadow-camera-top={SHADOW_CAMERA_HALF}
        shadow-camera-bottom={-SHADOW_CAMERA_HALF}
      />
      <Suspense fallback={null}>
        <Physics gravity={GRAVITY} colliders={false}>
          <Cabinet />
          {instances.map((instance, index) => {
            const kind = KIND_BY_ID.get(instance.kindId);
            if (kind === undefined) return null;
            return (
              <Doll
                key={instance.id}
                instance={instance}
                kind={kind}
                spawnAt={spawnPoints[index]}
                isVanishing={vanishingIds.has(instance.id)}
                onVanished={onVanished}
                register={register}
              />
            );
          })}
          {children}
        </Physics>
      </Suspense>
    </Canvas>
  );
}

/** 카메라는 플레이어가 돌릴 수 없다. 화면비가 바뀔 때마다 기계 폭이 화면 폭에 맞도록 세로 시야각을 다시 정한다. */
function FixedCamera(): ReactElement {
  const aspect = useThree((state) => state.size.width / state.size.height);
  const setStore = useThree((state) => state.set);
  const cameraRef = useRef<PerspectiveCamera>(null);

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (camera === null) return;
    setStore({ camera });
  }, [setStore]);

  return (
    <perspectiveCamera
      ref={cameraRef}
      position={CAMERA_POSITION}
      fov={MathUtils.radToDeg(2 * Math.atan(HALF_WIDTH_TAN / aspect))}
      aspect={aspect}
      near={CAMERA_NEAR}
      far={CAMERA_FAR}
      onUpdate={aimCamera}
    />
  );
}

/** 속성이 바뀔 때마다 시선을 다시 맞추고 투영을 새로 계산한다 */
function aimCamera(camera: PerspectiveCamera): void {
  camera.lookAt(...CAMERA_TARGET);
  camera.updateProjectionMatrix();
}

const CABINET_LAYOUT = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
const KIND_BY_ID = new Map(DOLL_KINDS.map((kind): [string, DollKind] => [kind.id, kind]));
const GRAVITY: Vector3Tuple = [0, GAME_CONFIG.physics.gravityY, 0];

const CAMERA_POSITION: Vector3Tuple = [0, 14, 22];
/** 시선을 기계 중심보다 낮춰 기계를 화면 위쪽에 두고 아래쪽에 조작부 자리를 남긴다 */
const CAMERA_TARGET: Vector3Tuple = [0, -1.2, 0];
/** 화면 가로 절반에 해당하는 시야 기울기. 세로 시야각 = 2·atan(이 값 / 화면비) */
const HALF_WIDTH_TAN = 0.175;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;
const MAX_PIXEL_RATIO = 2;

const SKY_COLOR = '#ffffff';
const GROUND_COLOR = '#ffc4dc';
const SKY_INTENSITY = 1.6;
const SUN_POSITION: Vector3Tuple = [2, 12, 5];
const SUN_INTENSITY = 1.8;
const SHADOW_MAP_SIZE = 1024;
/** 그림자를 계산하는 범위(바닥보다 조금 넓게) */
const SHADOW_CAMERA_HALF = 5;
