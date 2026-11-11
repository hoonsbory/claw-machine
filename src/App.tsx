import { css, injectGlobal } from '@emotion/css';
import type { ReactElement } from 'react';
import { GameScreen } from './GameScreen';
import { createBrowserStorage } from './session/browserStorage';
import { DESIGN_TOKENS } from './theme/tokens';
import { ChargePage } from './ui/ChargePage';
import { SkyBackdrop } from './ui/backdrop/SkyBackdrop';
import { useIsChargeRoute } from './ui/useChargeRoute';

const STORAGE = createBrowserStorage();

/**
 * 9:16 틀과 하늘 바탕을 깔고, 주소 해시가 `#charge` 면 충전 페이지를, 아니면 게임 화면을 그 위에 놓는다.
 * 충전 페이지가 떠 있는 동안 게임 화면은 그려지지 않는다.
 */
function App(): ReactElement {
  const isChargeRoute = useIsChargeRoute();

  return (
    <div className={screen}>
      <main className={frame}>
        <SkyBackdrop />
        {isChargeRoute ? <ChargePage storage={STORAGE} /> : <GameScreen storage={STORAGE} />}
      </main>
    </div>
  );
}

export default App;

injectGlobal(`
  body {
    margin: 0;
    touch-action: none;
    user-select: none;
    overflow: hidden;
    background: ${DESIGN_TOKENS.color.skyDeep};
  }
`);

/** 노트북처럼 넓은 화면에서 9:16 틀이 화면처럼 떠 보이도록 틀 둘레에 까는 옅은 그림자 */
const FRAME_SHADOW = `0 0 0 ${DESIGN_TOKENS.line.width}px ${DESIGN_TOKENS.color.shadow}, 0 12px 40px ${DESIGN_TOKENS.color.shadow}`;

/** 틀 밖은 같은 하늘색을 조금 진하게 칠해 틀이 화면으로 읽히게 한다 */
const screen = css`
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100dvh;
  background: ${DESIGN_TOKENS.color.skyDeep};
`;

/** 폰에서는 화면 전체, 넓은 화면에서는 가운데 9:16 세로 틀. 바탕 그림 위에 게임 화면이나 충전 페이지를 겹쳐 놓는다. */
const frame = css`
  position: relative;
  width: 100%;
  max-width: calc(100dvh * 9 / 16);
  height: 100dvh;
  box-shadow: ${FRAME_SHADOW};
  touch-action: none;
  user-select: none;
  overflow: hidden;
`;
