import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * public/plugin.json 的颜色匹配正则 —— 本轮修过, 最需要上锁
 *
 * 修复前的缺陷: 裸 hex 分支 `^[a-f0-9]{6}$` 没有要求"必须同时含数字和字母",
 * 导致 decade / facade / accede / beaded / 123456 / 000000 / ffffff 全被误判为颜色。
 * 现在加了两个 lookahead 要求同时出现数字与 a-f 字母。
 */

interface PluginCmd { type?: string; match?: string; maxLength?: number; label?: string }
interface PluginFeature { code: string; cmds: Array<string | PluginCmd> }

const plugin = JSON.parse(
  readFileSync(resolve(__dirname, '../public/plugin.json'), 'utf-8'),
) as { features: PluginFeature[] };

/** 取出某个功能里 type=regex 的那条命令 */
function regexCmd(featureCode: string): PluginCmd {
  const feature = plugin.features.find((f) => f.code === featureCode);
  if (!feature) throw new Error(`plugin.json 里找不到 feature: ${featureCode}`);
  const cmd = feature.cmds.find((c): c is PluginCmd => typeof c === 'object' && c.type === 'regex');
  if (!cmd) throw new Error(`feature ${featureCode} 里没有 regex 命令`);
  return cmd;
}

/** JSON 里存的是 "/^...$/i" 字符串, 剥掉首尾定界符还原成 RegExp */
function toRegExp(match: string): RegExp {
  const m = match.match(/^\/(.*)\/([a-z]*)$/s);
  if (!m) throw new Error(`match 不是 /.../flags 形式: ${match}`);
  return new RegExp(m[1]!, m[2]!);
}

const colorRe = toRegExp(regexCmd('color').match!);
const aiRe = toRegExp(regexCmd('ai').match!);

describe('两份颜色正则必须一致', () => {
  it('color(cmds[2]) 与 ai(cmds[1]) 的 match 逐字节相同', () => {
    expect(regexCmd('color').match).toBe(regexCmd('ai').match);
  });

  it('maxLength 也一致', () => {
    expect(regexCmd('color').maxLength).toBe(regexCmd('ai').maxLength);
  });
});

describe.each([
  ['color', colorRe],
  ['ai', aiRe],
])('%s 功能正则', (_name, re) => {
  it.each([
    '#fff',
    '#FFF',
    '#ffffff',
    '#FFFFFF',
    '#11223344',
    'ff0000',
    'a1b2c3',
    '255, 0, 0',
    '255 0 0',
    'rgb(1,2,3)',
    'rgb(1, 2, 3)',
    'rgba(1,2,3,0.5)',
    'hsl(120, 50%, 50%)',
    'hsla(120, 50%, 50%, 0.5)',
    'hsv(120, 50%, 50%)',
    '#fff;',
  ])('应当匹配: %s', (input) => {
    expect(re.test(input)).toBe(true);
  });

  it.each([
    // 裸 hex 分支的历史假阳性 —— 本轮修复的核心
    'decade',
    'facade',
    'accede',
    'beaded',
    '123456',
    '000000',
    'ffffff',
    // 其它非法输入
    '#gggggg',
    '',
    'rgb(1,2,3',
    'rgb(1,2,3)extra',
    'rgb(255, 0, 0,)',
    'hsl(120, 50%, 50%%',
    'rgb(999,0,0)',
    '1,2',
    '1,2,3,4',
    '999,999,999',
    '#ffff',
    'the cafe',
    'red',
  ])('应当拒绝: %s', (input) => {
    expect(re.test(input)).toBe(false);
  });

  it('正则无 g/y 标志, lastIndex 不会导致交替调用结果漂移', () => {
    expect(colorRe.global).toBe(false);
    expect(colorRe.sticky).toBe(false);
  });
});
