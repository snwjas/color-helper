import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db, dbStorage, copyText } from '../utils/platform';

/**
 * utils/platform.ts 的浏览器降级路径
 *
 * 注意: 本文件在 happy-dom 下运行 —— 模块顶层就读了 window.platform,
 * node 环境会直接抛 "window is not defined"(见 vitest.config.ts 的 environment)。
 * 测试只需保证 window.platform 不存在, 即走降级分支。
 */

const PREFIX = 'color_helper_';

beforeEach(() => {
  localStorage.clear();
  delete (window as any).platform;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('dbStorage 降级(localStorage)', () => {
  it('setItem / getItem 往返, 存的是 JSON', () => {
    dbStorage.setItem('setting', true);
    expect(localStorage.getItem(`${PREFIX}setting`)).toBe('true');
    expect(dbStorage.getItem('setting')).toBe(true);
  });

  it('未设置的 key 返回 null', () => {
    expect(dbStorage.getItem('nope')).toBeNull();
  });

  it('removeItem 移除键', () => {
    dbStorage.setItem('k', 1);
    dbStorage.removeItem('k');
    expect(dbStorage.getItem('k')).toBeNull();
  });

  it('**损坏的 JSON 返回 null 而不是抛错**', () => {
    localStorage.setItem(`${PREFIX}broken`, '{ not json');
    expect(() => dbStorage.getItem('broken')).not.toThrow();
    expect(dbStorage.getItem('broken')).toBeNull();
  });
});

describe('db 降级(localStorage)', () => {
  it('put 写入并按 _rev 递增', () => {
    const r1 = db.put({ _id: 'c1', color: '#fff' });
    expect(r1).toMatchObject({ ok: true, id: 'c1', rev: '1' });

    const r2 = db.put({ _id: 'c1', color: '#000' });
    expect(r2.rev).toBe('2');
    expect(db.get('c1')).toMatchObject({ _id: 'c1', color: '#000', _rev: '2' });
  });

  it('get 对损坏 JSON 返回 null 而不是抛错', () => {
    localStorage.setItem(`${PREFIX}db_c2`, '}}}');
    expect(() => db.get('c2')).not.toThrow();
    expect(db.get('c2')).toBeNull();
  });

  it('remove 删除文档', () => {
    db.put({ _id: 'c3' });
    expect(db.remove({ _id: 'c3' })).toEqual({ ok: true });
    expect(db.get('c3')).toBeNull();
  });

  it('allDocs 返回全部文档', () => {
    db.put({ _id: 'collect_1', color: '#111' });
    db.put({ _id: 'collect_2', color: '#222' });
    db.put({ _id: 'other_1', color: '#333' });
    const all = db.allDocs();
    expect(all.map((d) => d._id).sort()).toEqual(['collect_1', 'collect_2', 'other_1']);
  });

  it('allDocs(key) 按 _id 前缀过滤', () => {
    db.put({ _id: 'collect_1' });
    db.put({ _id: 'collect_2' });
    db.put({ _id: 'other_1' });
    expect(db.allDocs('collect').map((d) => d._id).sort()).toEqual(['collect_1', 'collect_2']);
  });

  it('**单个文档损坏只跳过该条, 其余照常返回**(本轮修复点)', () => {
    db.put({ _id: 'collect_1', color: '#111' });
    db.put({ _id: 'collect_2', color: '#222' });
    // 插一条坏数据, 模拟一个文档写坏
    localStorage.setItem(`${PREFIX}db_collect_bad`, '{ oops');

    const docs = db.allDocs('collect');
    expect(docs.map((d) => d._id).sort()).toEqual(['collect_1', 'collect_2']);
    // 关键: 不是返回 []
    expect(docs.length).toBe(2);
  });

  it('全部文档都损坏时返回空数组(不是抛错)', () => {
    localStorage.setItem(`${PREFIX}db_a`, '{');
    localStorage.setItem(`${PREFIX}db_b`, '}');
    expect(() => db.allDocs()).not.toThrow();
    expect(db.allDocs()).toEqual([]);
  });

  it('忽略前缀不匹配的 localStorage 键', () => {
    localStorage.setItem('unrelated_key', JSON.stringify({ _id: 'x' }));
    localStorage.setItem(`${PREFIX}other`, 'plain string');
    expect(db.allDocs()).toEqual([]);
  });
});

describe('copyText 的降级与回退', () => {
  it('平台存在时直接走平台 API, 不碰 navigator.clipboard', async () => {
    // platform 是模块顶层读的(const platform = window.platform),
    // 所以必须重置模块注册表后重新 import 才能让桩生效 —— 这也正是
    // NEXT-TASK.md §1.3 提到的"顶层读 window"的代价
    const platformCopy = vi.fn();
    (window as any).platform = { copyText: platformCopy };
    const clipboardSpy = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText: clipboardSpy } });

    vi.resetModules();
    const fresh = await import('../utils/platform');
    fresh.copyText('#abcdef');

    expect(platformCopy).toHaveBeenCalledWith('#abcdef');
    expect(clipboardSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('clipboard.writeText 成功时不走 execCommand', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const execSpy = vi.fn(() => true);
    document.execCommand = execSpy;

    copyText('#123456');
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('#123456');
    expect(execSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('**clipboard 被拒(Promise reject)时回退到 execCommand** —— 本轮修的真 bug', async () => {
    // 修复前: try/catch 是同步的, 接不住 Promise 的异步 reject,
    // 所以权限被拒时静默丢弃, 根本走不到回退分支。
    const writeText = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const execSpy = vi.fn(() => true);
    document.execCommand = execSpy;

    copyText('#aabbcc');
    // 等 writeText 的 reject 被 catch 处理
    await new Promise((r) => setTimeout(r, 0));

    expect(writeText).toHaveBeenCalledWith('#aabbcc');
    expect(execSpy).toHaveBeenCalledWith('copy');
    vi.unstubAllGlobals();
  });

  it('navigator.clipboard 不存在(非安全上下文)时直接走 execCommand', () => {
    vi.stubGlobal('navigator', {});
    const execSpy = vi.fn(() => true);
    document.execCommand = execSpy;

    copyText('#000000');

    expect(execSpy).toHaveBeenCalledWith('copy');
    vi.unstubAllGlobals();
  });

  it('回退实现不留残留 textarea 在 DOM 里', () => {
    vi.stubGlobal('navigator', {});
    document.execCommand = vi.fn(() => true);

    copyText('#eeeeee');

    expect(document.querySelectorAll('textarea')).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('回退实现把文本写进了 textarea', () => {
    vi.stubGlobal('navigator', {});
    let captured = '';
    document.execCommand = vi.fn(() => {
      captured = (document.querySelector('textarea') as HTMLTextAreaElement)?.value ?? '';
      return true;
    });

    copyText('#fedcba');

    expect(captured).toBe('#fedcba');
    vi.unstubAllGlobals();
  });
});
