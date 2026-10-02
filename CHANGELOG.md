# Changelog

## 1.1.0

### 修复

- 修复 `tsconfig.json` 的 `include` 路径，让 `tsc` 真正检查代码
- 修复渐变导出图片与预览不一致（渐变线长度算错）
- 统一全项目的明暗判定判据（原先混用三套阈值）
- 修复 `plugin.json` 色值正则误判普通单词为颜色
- 修复图片色卡无法通过 `img` / `files` 命令带入图片
- 修复传统色部分色块文字对比度不足
- 修复收藏颜色删除后残留索引、单个文档损坏导致整批丢失
- 修复剪贴板回退逻辑从未生效（接不住 Promise reject）
- 修复懒加载页面加载失败时整页白屏
- 修复 `@mui/icons-material` 在 vite 8 下导致的整页白屏

### 变更

- 渐变页复制操作增加反馈，浏览器下降级为下载 PNG
- 渐变色 / 图片色卡 / AI 配色三页改为懒加载
- 构建链升级至 vite 8 + vitest 4，`pnpm audit` 归零
- 环境要求提升至 Node 22，锁定 pnpm 版本

### 新增

- 引入 vitest 测试基建（`pnpm test` / `pnpm test:run`）
- 抽出 `utils/gradient.ts`

### 移除

- 移除 `package-lock.json`、死依赖 `react-router-dom`
- 移除 `utils/storage.ts`、`context/AppContext.tsx` 及各类死代码

## 1.0.0

### 新增

- 颜色助手：颜色、AI 配色、图片色卡、UI 色卡、传统色、渐变色、收藏颜色
