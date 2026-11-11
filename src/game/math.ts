/** value를 min~max 범위 안으로 자른다 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
