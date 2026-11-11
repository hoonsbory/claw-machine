import { css, cx } from '@emotion/css';
import { useState, type ReactElement } from 'react';
import { getDecoUrl } from '../config/stickers';

export interface DecoImageProps {
  /** public/deco/ 아래 그림 파일 이름 */
  file: string;
  /** 자리·크기·움직임 */
  className: string;
}

/**
 * 장식 그림 하나. 누르기를 그대로 통과시키고, 화면 읽기 프로그램에는 보이지 않는다(alt="").
 * 그림을 받지 못하면 깨진 그림 표시 없이 사라지고 다시 받으려 하지 않는다.
 */
export function DecoImage({ file, className }: DecoImageProps): ReactElement | null {
  const [hasFailed, setHasFailed] = useState(false);
  if (hasFailed) return null;

  return (
    <img
      className={cx(decoImage, className)}
      src={getDecoUrl(file)}
      alt=""
      draggable={false}
      onError={(): void => setHasFailed(true)}
    />
  );
}

const decoImage = css`
  position: absolute;
  height: auto;
  pointer-events: none;
  user-select: none;
`;
