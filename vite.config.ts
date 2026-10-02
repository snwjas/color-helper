import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    // @mui/icons-material 是 CJS 包(有 module 字段但无 exports 字段)。
    // vite 8 收紧了 CJS default import 语义后, 对 type:module 的导入方会把
    // default 解析成整个 module.exports 命名空间对象, 直接渲染即抛 React #130。
    // 显式指向包内自带的 ESM 副本, 从根上避开 CJS interop。
    alias: [
      { find: /^@mui\/icons-material\/(.*)$/, replacement: '@mui/icons-material/esm/$1' },
    ],
  },
})
