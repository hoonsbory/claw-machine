/** 주소 맨 앞의 / */
const LEADING_SLASH = /^\//;

/**
 * public/ 아래 상대 경로(예: `dolls/rabbit.glb`, `stickers/usagi.png`)를 실제로 읽을 주소로 바꾼다. 모델·스티커 주소는 여기서만 만든다.
 * 앱이 놓인 경로(import.meta.env.BASE_URL) 뒤에 붙여, 빌드 결과물을 하위 경로에 올려도 그 아래의 파일을 읽는다.
 * 앞에 / 를 붙여 적었어도 같은 주소가 된다.
 */
export function resolvePublicUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(LEADING_SLASH, '')}`;
}
