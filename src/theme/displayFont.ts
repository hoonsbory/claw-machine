import { DESIGN_TOKENS } from './tokens';

/** document.fonts 중 여기서 쓰는 부분. 시험에서는 가짜를 넣는다. */
export interface FontSource {
  load(font: string, text: string): Promise<readonly unknown[]>;
  addEventListener(type: 'loadingdone', listener: () => void): void;
  removeEventListener(type: 'loadingdone', listener: () => void): void;
}

/** 글꼴을 물을 때 쓰는 크기. 어느 크기로 물어도 같은 글꼴 파일이 준비된다. */
const PROBE_SIZE = 32;

/**
 * 캔버스에 그리는 글자(간판)가 화면 글꼴로 그려지도록, text 의 글자들이 화면 글꼴로 준비되면 onReady 를 한 번 부른다.
 *
 * 화면 글꼴 스타일시트는 index.html 이 첫 화면을 막지 않으려고 늦게 붙이므로, 처음 물을 때는 글꼴이 아직 없을 수 있다
 * (그때 document.fonts.load 는 빈 목록을 돌려준다). 그래서 지금 한 번 묻고, 글꼴 파일을 하나 받을 때마다(loadingdone) 다시 묻는다.
 * 화면의 글자(뽑은 수 배지, 내리기 버튼)가 화면 글꼴을 쓰므로 스타일시트가 붙으면 곧 글꼴 받기가 일어나 다시 묻게 된다.
 * 준비되면 알리고 더 듣지 않는다. 글꼴 서버가 막혀 끝내 못 받으면 부르지 않고, 캔버스 글자는 대체 글꼴로 남는다.
 * 돌려준 함수를 부르면 그만 듣고, 이미 시작한 물음이 나중에 돌아와도 알리지 않는다.
 */
export function whenDisplayFontReady(text: string, onReady: () => void, fonts: FontSource = document.fonts): () => void {
  const query = `${PROBE_SIZE}px ${DESIGN_TOKENS.font.displayFamily}`;
  let isStopped = false;

  const stop = (): void => {
    isStopped = true;
    fonts.removeEventListener('loadingdone', ask);
  };

  function ask(): void {
    if (isStopped) return;
    fonts.load(query, text).then(
      (faces): void => {
        if (isStopped || faces.length === 0) return;
        stop();
        onReady();
      },
      // 받지 못한 글꼴은 대체 글꼴로 두면 되므로 오류를 밖으로 내보내지 않는다
      (): void => undefined,
    );
  }

  fonts.addEventListener('loadingdone', ask);
  ask();
  return stop;
}
