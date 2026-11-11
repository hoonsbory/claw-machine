/**
 * 화면 전체가 같이 쓰는 디자인 값. 색·글꼴·선 두께·둥글기·그림자는 여기에만 두고, UI 스타일과 3D 재질이 모두 여기서 읽는다.
 *
 * 분위기: 손으로 그린 그림책처럼 포근하고 둥글게. 회색 금속이나 쨍한 색은 쓰지 않는다.
 * 선과 글자는 모두 따뜻한 갈색이고 검정은 쓰지 않는다. 산호색은 누르는 것(내리기 버튼)과 강조에만 쓴다.
 *
 * index.html 은 이 파일을 불러올 수 없어서, 앱을 받는 동안 보이는 바탕과 글자의 색·글꼴을 그 안에 따로 적어 두었다.
 * 여기서 sky·cream·line·skyDeep 이나 글꼴을 바꾸면 index.html 의 같은 값도 함께 바꾼다.
 */
export const DESIGN_TOKENS = {
  color: {
    /** 기본 팔레트 */
    cream: '#fff8ea',
    butter: '#ffe9a8',
    peach: '#ffc9d2',
    coral: '#ff9aa8',
    sky: '#cfeaf7',
    mint: '#cdeccd',
    lavender: '#e3d9f6',
    /** 모든 테두리와 글자 */
    line: '#7a5646',
    /** 부드러운 그림자 */
    shadow: 'rgba(122, 86, 70, 0.25)',
    /** 캔버스 그림자 띠(배출구 안쪽 그늘, 기계 발치 그림자)의 진한 쪽과, 같은 색이 완전히 사라진 끝 */
    shadowStrong: 'rgba(122, 86, 70, 0.4)',
    shadowClear: 'rgba(122, 86, 70, 0)',

    /** 팔레트에서 한 단계 진하거나 옅게 뺀 색 */
    coralDeep: '#ec8191',
    peachDeep: '#f7b3bf',
    butterDeep: '#f6d47e',
    mintDeep: '#b3dfb3',
    skyDeep: '#b6dbee',
    /** 집게 손가락의 따뜻한 금색 */
    gold: '#f2c66d',
    /** 배출구 구멍 */
    chuteHole: '#9a6b57',
    /** 비활성 버튼 */
    disabledFace: '#ffe2e6',
    disabledLip: '#f3cad1',
    /** 흐린 선과 흐린 글자(비활성, 보조 설명) */
    lineSoft: 'rgba(122, 86, 70, 0.45)',
    /** 공 손잡이 같은 둥근 면의 반짝임 */
    highlight: 'rgba(255, 255, 255, 0.75)',
    /** 축하 화면 바탕의 은은한 빛 */
    glowCenter: 'rgba(255, 248, 234, 0.96)',
    glowEdge: 'rgba(255, 201, 210, 0.92)',
    /** 3D 조명: 거의 흰 따뜻한 빛. 색을 물들이지 않고 파스텔을 그대로 밝힌다. */
    lightSky: '#fffaf3',
    lightGround: '#fff1ec',
    /** 조정 패널 바탕 */
    panel: 'rgba(255, 248, 234, 0.95)',
  },
  font: {
    /** 화면에 보이는 모든 글자. Jua(Google Fonts)를 못 받으면 시스템 글꼴로 보인다. */
    family: `'Jua', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif`,
    /** 캔버스에 글자를 그리기 전에 이 글꼴이 준비됐는지 확인한다 */
    displayFamily: 'Jua',
    /** Jua 는 굵기가 하나뿐이라 그대로 쓰고(font-synthesis: none), 대체 시스템 글꼴만 굵게 보이게 한다 */
    weight: 700,
  },
  line: {
    /** UI 테두리 두께(px) */
    width: 2,
    /** 큰 버튼 테두리 두께(px) */
    thickWidth: 3,
  },
  radius: {
    pill: 999,
    panel: 16,
  },
  shadow: {
    /** 작은 배지·버튼: 아래로 살짝 밀린 손그림 그림자 */
    sticker: '0 3px 0 rgba(122, 86, 70, 0.25)',
    /** 큰 버튼 아래 바닥 그림자 */
    drop: '0 10px 16px rgba(122, 86, 70, 0.25)',
    /** 축하 글자판 */
    plate: '0 4px 0 rgba(122, 86, 70, 0.25), 0 8px 18px rgba(122, 86, 70, 0.18)',
  },
} as const;
