/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 결과물이 자기 파일을 상대 주소로 불러, 정적 호스팅의 하위 경로(예: /secret-path/)에 올려도 빈 화면이 되지 않는다
  base: './',
  plugins: [react()],
  test: {
    // dist/·.claude-worktrees/ 는 테스트 대상이 아니다
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
