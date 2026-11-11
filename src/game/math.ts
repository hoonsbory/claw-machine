import type { Vec2 } from './types';

/** value를 min~max 범위 안으로 자른다 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 방향은 그대로 두고 길이가 maxLength 를 넘지 않게 줄인다 */
export function clampLength(vector: Vec2, maxLength: number): Vec2 {
  const length = Math.hypot(vector.x, vector.z);
  if (length <= maxLength) return vector;

  const ratio = maxLength / length;
  return { x: vector.x * ratio, z: vector.z * ratio };
}
