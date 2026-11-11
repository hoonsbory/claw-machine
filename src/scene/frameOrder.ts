/**
 * 매 프레임 작업(useFrame) 순서. 작은 수가 먼저 돈다. 0 보다 큰 값을 쓰면 R3F 가 화면을 스스로 그리지 않으므로 음수만 쓴다.
 * 물리 단계(그 직전마다 집게 상태가 함께 나아간다) → 집게 그릴 위치 보간 → 그 밖의 작업(기본값 0, 집게·인형 모양 갱신) 순서다.
 */
export const PHYSICS_FRAME_PRIORITY = -2;
export const CLAW_VIEW_FRAME_PRIORITY = -1;

/**
 * <Physics> 가 한 프레임 시간을 자르는 상한(라이브러리 안에 정해진 값). 탭이 뒤로 갔다 오면 프레임 시간이 수십 초가 되어도
 * 물리는 이만큼만 나아가므로, 물리와 같은 시간으로 셈해야 하는 곳(집게 보간, 인형이 처음 떨어진 시간)이 따라 쓴다.
 */
export const PHYSICS_MAX_FRAME_DELTA = 0.5;
