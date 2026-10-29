import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const moduleUrl=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const source=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}}).outputText;
code=code.replace(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];/g,(_all,names,specifier)=>{
 if(specifier==='react'||specifier==='lucide-react')return `import ${names} from ${JSON.stringify(import.meta.resolve(specifier))};`;
 let stub;
 if(specifier==='./context/AppContext')stub='export const useApp=()=>globalThis.__gateFixture;export const AppProvider=({children})=>children;';
 else stub=names.replace(/[{}]/g,'').split(',').map(s=>s.trim()).filter(Boolean).map(name=>`export const ${name}=()=>${JSON.stringify(name)};`).join('\n');
 return `import ${names} from ${JSON.stringify(moduleUrl(stub))};`;
});
const {default:App}=await import(moduleUrl(code));
function render(role,needsChange,tab='dashboard') {
 globalThis.__gateFixture={currentUser:{id:'synthetic',name:'Synthetic',email:'synthetic@example.invalid',role,status:'active'},activeTab:tab,isAuthenticated:true,authReady:true,authError:'',syncError:'',mustChangePassword:needsChange,setActiveTab(){},openAuthModal(){},changeOwnPassword(){},logout(){}};
 return renderToStaticMarkup(React.createElement(App));
}
test('all roles including the direct admin route must finish a required password change',()=>{
 for(const role of ['student','parent','psychologist','admin']) {
  const html=render(role,true,role==='admin'?'admin':'dashboard');
  assert.match(html,/Đổi mật khẩu để tiếp tục/);
  assert.ok(!html.includes('AdminDashboard'));
 }
});
test('admin dashboard becomes available after the password-change requirement is cleared',()=>{
 const html=render('admin',false,'admin');assert.match(html,/AdminDashboard/);assert.ok(!html.includes('Đổi mật khẩu để tiếp tục'));
});
