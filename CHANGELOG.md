# Changelog

## 1.1.0

### 修复

- 修复 `tsconfig.json` 的 `include` 路径，让 `tsc` 真正检查代码
- 修复渐变导出图片与预览不一致（渐变线长度算错）
- 统一明暗判定判据（原先混用三套阈值），修复传统色部分色块文字对比度不足
- 修复颜色输入识别：正则误判普通单词为颜色，主输入框里大写色值不匹配
- 修复 AI 调用硬编码了宿主解析不出的模型 ID，导致总是报「未找到 AI 模型配置」
- 修复图片色卡无法通过 `img` / `files` 命令带入图片
- 修复收藏颜色删除后残留索引、单个文档损坏导致整批丢失
- 修复剪贴板回退逻辑从未生效（接不住 Promise reject）
- 修复两处导致整页白屏的问题：懒加载页面加载失败、图标库在 vite 8 下不兼容

### 变更

- 渐变页复制操作增加反馈，浏览器下降级为下载 PNG
- 渐变色 / 图片色卡 / AI 配色三页改为懒加载
- 图片色卡四个版式重做，色值内嵌色块、字号按槽位自适应
- 构建链与依赖升级：vite 8 + vitest 4、Node 22、chroma-js 3、MUI 7、React 19，锁定 pnpm 版本，`pnpm audit` 归零

### 新增

- 引入 vitest 测试基建（`pnpm test` / `pnpm run test:run`）
- 抽出 `utils/gradient.ts`
- `window.platform` 类型声明逐条对齐官方 `ztools.api.d.ts`

### 移除

- 移除死代码与无用文件：`package-lock.json`、`react-router-dom`、`utils/storage.ts`、`context/AppContext.tsx`
- 移除 `plugin.json` 里不被官方 schema 识别的 `pluginName` 字段

## 1.0.0

### 新增

- 颜色助手：颜色、AI 配色、图片色卡、UI 色卡、传统色、渐变色、收藏颜色
