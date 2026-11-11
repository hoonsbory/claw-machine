import { css, injectGlobal } from '@emotion/css';
import type { ReactElement } from 'react';

function App(): ReactElement {
  return (
    <div className={screen}>
      <main className={frame} />
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
