// 颜色数据模型
//
// 与 data/*.json 的实际形状一一对应(已逐一核对, 见各注释)。
// 注意: tsconfig 开启了 resolveJsonModule, JSON 推断为字面量类型,
// 因此结构不符不会在编译期报错 —— 必须靠这里的接口约束住,
// 各页面通过 `as unknown as Xxx[]` 显式声明形状后再消费。

/** 渐变色预设 —— data/gradients-*.json 的实际形状: 颜色数组的数组(无 name/angle/category) */
export type GradientPreset = string[];

/** Material Design 色板 —— data/ui-material-design.json: 14 槽(10 主色 + A100~A400, 部分色系无强调色时为空串) */
export interface MaterialColorCategory {
  title: string;
  colors: string[];
}

/** 通用 UI 色板 —— data/ui-ant-design.json / ui-open-color.json / ui-fluent.json */
export interface UIColorCategory {
  title: string;
  colors: string[];
  /** 仅 ant-design 提供, 作者标注(如"平稳、中态"), 界面暂未展示 */
  description?: string;
}

/** Flat UI 色板 —— data/ui-flat-ui.json: 每槽为一组色阶(6 个字符串), 不是单个色值 */
export interface FlatUIColorCategory {
  title: string;
  colors: string[][];
}

/** 中国传统色分组 —— data/traditional-china.json: { title, colors: [{name,color}] } */
export interface ChinaColorCategory {
  title: string;
  colors: Array<{ name: string; color: string }>;
}

/** 日本传统色条目 —— data/traditional-japan.json: 扁平列表, 额外带日语假名 */
export interface JapanColorItem {
  name: string;
  color: string;
  jname: string;
}

// 平台 API 类型声明
declare global {
  interface Window {
    platform?: {
      onPluginEnter: (callback: (action: { code: string; type: string; payload: any }) => void) => void;
      onPluginOut: (callback: () => void) => void;
      dbStorage: {
        getItem: (key: string) => any;
        setItem: (key: string, value: any) => void;
        removeItem: (key: string) => void;
      };
      copyText: (text: string) => void;
      copyImage: (base64: string) => void;
      showNotification: (title: string, body: string) => void;
      setSubInput: (callback: (data: { text: string }) => void, placeholder: string, isFocus: boolean) => void;
      removeSubInput: () => void;
      hideMainWindow: () => void;
      showMainWindow: () => void;
      outPlugin: () => void;
      showSaveDialog: (options: {
        title: string;
        defaultPath: string;
        buttonLabel: string;
        filters: Array<{ extensions: string[]; name: string }>;
      }) => string | undefined;
      showOpenDialog: (options: {
        title?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
        properties?: string[];
      }) => string[] | undefined;
      shellShowItemInFolder: (path: string) => void;
      getPath: (name: string) => string;
      pickColor: () => string;
      screenColorPick: (callback: (result: { hex: string; rgb: string }) => void) => void;
      screenCapture: (callback: (data: string) => void) => void;
      db: {
        put: (doc: any) => any;
        get: (id: string) => any;
        remove: (id: any) => any;
        allDocs: (key?: string) => any[];
      };
    };
    services?: {
      saveColorCard: (buffer: ArrayBuffer) => Promise<void>;
    };
    __platformNavigate?: ((path: string, state?: any) => void) | null;
    __platformSetInitialData?: ((data: any) => void) | null;
  }
}

export {};
