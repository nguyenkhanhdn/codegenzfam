import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise real Express handlers with the provider replaced at its SDK boundary.
const calls = [];
let failure;
let source = await readFile(new URL('../server/aiRoutes.ts', import.meta.url), 'utf8');
source = source.replace('import { GoogleGenAI } from "@google/genai";', `const GoogleGenAI = globalThis.__testGemini;`);
globalThis.__testGemini = class {
  models = { generateContent: async (params) => {
    calls.push(params);
    if (failure) throw failure;
    return { text: params.config?.responseMimeType === 'application/json' ? '{"icebreakers":["Chào bố mẹ"]}' : 'Mình đang lắng nghe bạn.' };
  }};
};
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { registerAiRoutes } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
delete globalThis.__testGemini;
const routes = new Map();
registerAiRoutes({ get: (p, h) => routes.set(p,h), post: (p,h) => routes.set(p,h) });
async function request(path, body) {
  const result = { status: 200 };
  const res = { status(s) { result.status=s; return this; }, json(data) { result.data=data; return this; } };
  await routes.get(path)({body,get:()=>undefined},res);
  return result;
}
test('AI Tutor uses the low-latency Gemini model, limits output and returns both role replies', async () => {
  const oldKey=process.env.GEMINI_API_KEY, oldModel=process.env.GEMINI_MODEL;
  process.env.GEMINI_API_KEY='test-secret'; delete process.env.GEMINI_MODEL;
  try {
    for (const role of ['student','parent']) {
      const r=await request('/api/ai/chat',{message:'Xin giúp tôi mở lời',role,history:[]});
      assert.equal(r.status,200); assert.ok(r.data.reply);
      assert.equal(calls.at(-1).model,'gemini-3.5-flash-lite');
      assert.equal(calls.at(-1).config.maxOutputTokens,1800);
      assert.ok(calls.at(-1).config.systemInstruction);
      assert.ok(!JSON.stringify(r.data).includes('test-secret'));
    }
    const invalid=await request('/api/ai/chat',{message:'',role:'student'});
    assert.equal(invalid.status,400);
    failure=Object.assign(new Error('secret provider payload'),{status:504});
    const timeout=await request('/api/ai/chat',{message:'Xin giúp tôi',role:'student'});
    assert.equal(timeout.status,502); assert.match(timeout.data.error,/quá nhiều thời gian/);
    assert.ok(!JSON.stringify(timeout.data).includes('secret provider payload'));
  } finally {
    failure=undefined;
    if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
    if(oldModel===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=oldModel;
  }
});
