/**
 * 매 프레임 작업(useFrame) 순서. 작은 수가 먼저 돈다. 0 보다 큰 값을 쓰면 R3F 가 화면을 스스로 그리지 않으므로 음수만 쓴다.
 * 물리 단계(그 직전마다 집게 상태가 함께 나아간다) → 집게 그릴 위치 보간 → 그 밖의 작업(기본값 0, 집게·인형 모양 갱신) 순서다.
 */
export const PHYSICS_FRAME_PRIORITY = -2;
export const CLAW_VIEW_FRAME_PRIORITY = -1;
