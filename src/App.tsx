import { css, injectGlobal } from '@emotion/css';
import type { ReactElement } from 'react';
import { DOLL_KINDS } from './config/dollCatalog';
import { GAME_CONFIG } from './config/gameConfig';
import { createInstances } from './game/collection';
import { GameCanvas } from './scene/GameCanvas';

/** 아직 뽑기 진행이 없어서 처음 15개를 그대로 보여 준다 */
const INSTANCES = createInstances(DOLL_KINDS, GAME_CONFIG.dolls.perKind, new Set());
const NO_VANISHING: ReadonlySet<string> = new Set();

function ignoreVanished(): void {
  // 아직 사라지는 인형이 없다
}

function App(): ReactElement {
  return (
    <div className={screen}>
      <main className={frame}>
        <GameCanvas instances={INSTANCES} vanishingIds={NO_VANISHING} onVanished={ignoreVanished} />
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
  }
`);

const screen = css`
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100dvh;
  background: linear-gradient(#ffe3ee, #ffc4dc);
`;

/** 폰에서는 화면 전체, 넓은 화면에서는 가운데 9:16 세로 틀 */
const frame = css`
  width: 100%;
  max-width: calc(100dvh * 9 / 16);
  height: 100dvh;
  touch-action: none;
  user-select: none;
  overflow: hidden;
`;
