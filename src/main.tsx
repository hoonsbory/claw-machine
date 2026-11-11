import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { consumeResetFlag, removeResetFlag } from './game/progressStore'
import { createBrowserStorage } from './session/browserStorage'

// 그리기 전에 ?reset 을 처리해야 첫 화면이 지운 기록으로 시작한다
if (consumeResetFlag(window.location.search, createBrowserStorage())) {
  // 새로고침 때 다시 지우지 않도록 주소에서 reset 만 뗀다(?debug 같은 다른 매개변수는 남긴다)
  const url = new URL(window.location.href)
  url.search = removeResetFlag(url.search)
  window.history.replaceState(window.history.state, '', url)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
