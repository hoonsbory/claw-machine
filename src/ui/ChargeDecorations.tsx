import { css, cx, keyframes } from '@emotion/css';
import type { ReactElement } from 'react';
import { DecoImage } from './DecoImage';
import { getBobClass, getPoseClass } from './decoMotion';

/** 그림이 자리를 잡는 기준 상자: 제목, 남은 기회 판, 페이지 전체 */
export type ChargeDecoAnchor = 'title' | 'count' | 'page';

export interface ChargeDecorationsProps {
  anchor: ChargeDecoAnchor;
}

/**
 * 충전 페이지의 캐릭터 그림(public/deco/). 기준 상자(position: relative) 안에 넣으면 그 상자에 딸린 그림만 그린다.
 * 제목 위·양옆과 남은 기회 판 양옆에 크게 두고, 아래 언덕에는 장난감 차를 탄 캐릭터가 오른쪽에서 왼쪽으로 천천히 지나간다.
 * 움직임 줄이기를 켠 사람에게는 차가 언덕 위 제자리에 서 있다.
 */
export function ChargeDecorations({ anchor }: ChargeDecorationsProps): ReactElement {
  return (
    <>
      {DECO_LOOKS.filter((look) => look.anchor === anchor).map((look) => (
        <DecoImage key={look.key} file={look.file} className={look.className} />
      ))}
    </>
  );
}

/**
 * 자리.
 * - title·count 의 above(위에 앉아 아랫부분이 판 뒤로 숨는다), left·right(판 옆)
 * - page 의 road: 아래 언덕을 지나가는 길. along 은 움직임을 줄였을 때 서 있는 자리(틀 왼쪽에서 %)이고, 지나갈 때도 이 순서로 간격을 둔다.
 */
type DecoSpot = { anchor: 'title' | 'count'; side: 'above' | 'left' | 'right' } | { anchor: 'page'; side: 'road'; along: number };

/** 그림 하나: 파일 이름, 자리, 폭(px), 기울기(도), 좌우 뒤집기 */
interface ChargeDeco {
  file: string;
  at: DecoSpot;
  width: number;
  tilt: number;
  isFlipped?: boolean;
}

/** 그림 하나를 넣거나 빼려면 이 목록의 한 줄만 고친다 */
const DECOS: readonly ChargeDeco[] = [
  { file: 'usagi.png', at: { anchor: 'title', side: 'above' }, width: 96, tilt: 0 },
  { file: 'kurimanju.png', at: { anchor: 'title', side: 'left' }, width: 84, tilt: -8 },
  { file: 'shisa.png', at: { anchor: 'title', side: 'right' }, width: 84, tilt: 8 },
  { file: 'chiikawa.png', at: { anchor: 'count', side: 'left' }, width: 96, tilt: -6 },
  { file: 'hachiware.png', at: { anchor: 'count', side: 'right' }, width: 96, tilt: 6 },
  { file: 'car-chiikawa.png', at: { anchor: 'page', side: 'road', along: 8 }, width: 88, tilt: 0 },
  { file: 'car-hachiware.png', at: { anchor: 'page', side: 'road', along: 40 }, width: 88, tilt: 0 },
  { file: 'car-usagi.png', at: { anchor: 'page', side: 'road', along: 72 }, width: 88, tilt: 0 },
];

/** 위에 앉은 그림이 판 뒤로 숨는 깊이, 옆 그림이 판 가장자리 뒤로 숨는 폭(px) */
const ABOVE_TUCK = 16;
const SIDE_TUCK = 10;
/** 차가 지나가는 길: 틀 아래에서의 높이(%), 한 번 지나가는 시간(초), 틀 밖에서 출발해 틀 밖까지 가는 범위(틀 폭 %) */
const ROAD_BOTTOM = 7;
const DRIVE_DURATION = 36;
const DRIVE_START = 100;
const DRIVE_END = -30;
/** 그림마다 둥실거림을 이만큼(초) 엇갈리게 시작한다 */
const BOB_STAGGER = -0.8;

/** 오른쪽 틀 밖에서 왼쪽 틀 밖으로(차가 왼쪽을 보고 있다) */
const drive = keyframes`
  from { left: ${DRIVE_START}%; }
  to { left: ${DRIVE_END}%; }
`;

/** along 자리를 지나는 순간부터 시작하도록 미리 지난 시간(음수 지연) */
function getDriveDelay(along: number): number {
  return (-(DRIVE_START - along) / (DRIVE_START - DRIVE_END)) * DRIVE_DURATION;
}

function getSpotClass(at: DecoSpot, width: number, index: number): string {
  if (at.side === 'road') {
    return css`
      bottom: ${ROAD_BOTTOM}%;
      left: ${at.along}%;

      @media (prefers-reduced-motion: no-preference) {
        animation: ${drive} ${DRIVE_DURATION}s ${getDriveDelay(at.along)}s linear infinite;
      }
    `;
  }

  const bobClass = getBobClass(index * BOB_STAGGER);
  if (at.side === 'above') {
    return cx(
      css`
        left: calc(50% - ${width / 2}px);
        bottom: calc(100% - ${ABOVE_TUCK}px);
      `,
      bobClass,
    );
  }

  // 판 옆: 판 쪽 가장자리를 판 뒤로 조금 넣고 세로 가운데에 맞춘다
  const innerEdge = at.side === 'left' ? 'right' : 'left';
  return cx(
    css`
      ${innerEdge}: calc(100% - ${SIDE_TUCK}px);
      top: 50%;
      transform: translateY(-50%);
    `,
    bobClass,
  );
}

interface DecoLook {
  key: string;
  file: string;
  anchor: ChargeDecoAnchor;
  className: string;
}

const DECO_LOOKS = DECOS.map(
  ({ file, at, width, tilt, isFlipped = false }, index): DecoLook => ({
    key: `${index}-${file}`,
    file,
    anchor: at.anchor,
    className: cx(
      css`
        width: ${width}px;
      `,
      getPoseClass(tilt, isFlipped),
      getSpotClass(at, width, index),
    ),
  }),
);
