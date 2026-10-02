/**
 * 平台 API 统一适配层
 * - 集中管理所有平台 API 调用
 * - 非平台环境提供 fallback
 * - 解耦业务代码与平台 API
 */

// 平台实例
const platform = window.platform;

//  localStorage key 前缀 
const STORAGE_PREFIX = 'color_helper_';

// 环境检测
export const isPlatform = !!platform;

//  dbStorage 适配 
export const dbStorage = {
  getItem(key: string): any {
    if (platform?.dbStorage) {
      return platform.dbStorage.getItem(key);
    }
    try {
      const v = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: any): void {
    if (platform?.dbStorage) {
      platform.dbStorage.setItem(key, value);
      return;
    }
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    } catch { /* ignore */ }
  },

  removeItem(key: string): void {
    if (platform?.dbStorage) {
      platform.dbStorage.removeItem(key);
      return;
    }
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch { /* ignore */ }
  },
};

//  db 适配 
export const db = {
  get(id: string): any {
    if (platform?.db) {
      return platform.db.get(id);
    }
    try {
      const v = localStorage.getItem(`${STORAGE_PREFIX}db_${id}`);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },

  put(doc: any): { ok: boolean; id: string; rev?: string; error?: string } {
    if (platform?.db) {
      return platform.db.put(doc);
    }
    try {
      const id = doc._id;
      const existing = db.get(id);
      const rev = existing?._rev ? String(parseInt(existing._rev || '0') + 1) : '1';
      const toSave = { ...doc, _rev: rev };
      localStorage.setItem(`${STORAGE_PREFIX}db_${id}`, JSON.stringify(toSave));
      return { ok: true, id, rev };
    } catch (e: any) {
      return { ok: false, id: doc._id, error: e.message };
    }
  },

  remove(doc: any): { ok: boolean; error?: string } {
    if (platform?.db) {
      return platform.db.remove(doc);
    }
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}db_${doc._id}`);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  allDocs(key?: string): any[] {
    if (platform?.db) {
      try {
        return platform.db.allDocs(key) ?? [];
      } catch {
        return [];
      }
    }
    const results: any[] = [];
    try {
      const prefix = `${STORAGE_PREFIX}db_`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        const v = localStorage.getItem(k);
        if (!v) continue;
        // 单个 doc 损坏只跳过该条, 不能让整批收藏都消失
        try {
          const doc = JSON.parse(v);
          if (doc && (!key || (typeof doc._id === 'string' && doc._id.startsWith(key)))) {
            results.push(doc);
          }
        } catch { /* skip corrupt doc */ }
      }
    } catch {
      return results;
    }
    return results;
  },
};

// 剪贴板

/** execCommand 回退: 非安全上下文(非 https / file)或 clipboard API 被拒时使用 */
function copyTextFallback(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function copyText(text: string): void {
  if (platform?.copyText) {
    platform.copyText(text);
    return;
  }
  // 注意: navigator.clipboard.writeText() 返回 Promise, 同步 try/catch 接不住
  // 异步 reject —— 权限被拒时旧写法会静默丢弃, 根本走不到回退分支。
  // 两种情况都要覆盖: API 不存在(同步抛)与 Promise reject(异步)。
  const clipboard = navigator.clipboard;
  if (!clipboard?.writeText) {
    copyTextFallback(text);
    return;
  }
  try {
    clipboard.writeText(text).catch(() => copyTextFallback(text));
  } catch {
    copyTextFallback(text);
  }
}

/** 复制图片到剪贴板(仅平台支持); 浏览器无对等 API, 降级为下载
 *  浏览器不静默丢弃, 否则按钮点击后毫无反应 */
export function copyImage(dataUrl: string, filename = 'image.png'): void {
  if (platform?.copyImage) {
    platform.copyImage(dataUrl);
    return;
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// 屏幕截图
export function screenCapture(callback: (imagePath: string) => void): void {
  if ((platform as any)?.screenCapture) {
    (platform as any).screenCapture(callback);
    return;
  }
  console.warn('[fallback] screenCapture not supported in browser');
}

// 屏幕取色
export function screenColorPick(callback: (result: { hex: string; rgb: string }) => void): void {
  if (platform?.screenColorPick) {
    platform.screenColorPick(callback);
    return;
  }
  // 非平台环境: 使用浏览器原生 EyeDropper API (Chrome 95+)
  if ((window as any).EyeDropper) {
    const dropper = new (window as any).EyeDropper();
    dropper.open().then((result: any) => {
      callback({ hex: result.sRGBHex, rgb: '' });
    }).catch(() => { /* cancelled */ });
    return;
  }
  console.warn('[fallback] screenColorPick not supported');
}

// 窗口控制
export function hideMainWindow(): void {
  if (platform?.hideMainWindow) {
    platform.hideMainWindow();
    return;
  }
  // 非平台环境无操作
}

export function showMainWindow(): void {
  if (platform?.showMainWindow) {
    platform.showMainWindow();
    return;
  }
}

// 插件生命周期
export function onPluginEnter(callback: (action: { code: string; type: string; payload: string }) => void): void {
  if (platform?.onPluginEnter) {
    platform.onPluginEnter(callback);
    return;
  }
  // 非平台环境: 直接触发一次模拟进入
  setTimeout(() => callback({ code: 'color', type: 'text', payload: '' }), 100);
}

export function onPluginOut(callback: () => void): void {
  if (platform?.onPluginOut) {
    platform.onPluginOut(callback);
    return;
  }
}

//  AI API 
// 调用方式: platform.ai({model:"doubao-1.5-pro-32k", messages:[...]})
// 返回 Promise<{content: string}>

export function isAIAvailable(): boolean {
  return !!(platform as any)?.ai && typeof (platform as any).ai === 'function';
}

export async function aiChat(messages: { role: string; content: string }[], model: string = 'doubao-1.5-pro-32k'): Promise<{ content: string }> {
  if (!isAIAvailable()) {
    throw new Error('当前版本不支持 AI 功能');
  }
  return (platform as any).ai({ model, messages });
}

// 文件对话框
export function showOpenDialog(options: any): string[] | undefined {
  if (platform?.showOpenDialog) {
    return platform.showOpenDialog(options);
  }
  return undefined;
}
