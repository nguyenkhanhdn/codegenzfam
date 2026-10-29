import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
async function component(path,extra={}) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}}).outputText;
 code=code.replace(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];/g,(_all,names,specifier)=>{
  if(specifier==='react'||specifier==='lucide-react')return `import ${names} from ${JSON.stringify(import.meta.resolve(specifier))};`;
  let target=extra[specifier];
  if(!target) target=url(specifier.endsWith('/AppContext')?'export const useApp=()=>globalThis.__dashboardFixture;':'export const aiService={};');
  return `import ${names} from ${JSON.stringify(target)};`;
 });
 const target=url(code);return {target,module:await import(target)};
}
const family=await component('../src/components/family/FamilyGroupWidget.tsx');
const student=await component('../src/components/student/StudentDashboard.tsx',{'../family/FamilyGroupWidget':family.target});
const parent=await component('../src/components/parent/ParentDashboard.tsx',{'../family/FamilyGroupWidget':family.target});
function fixture(role,tasks=[]) {
 globalThis.__dashboardFixture={currentUser:{id:'synthetic',name:'Synthetic User',role},family:{id:'',familyCode:'',name:'Gia đình',happinessPoints:0,streakDays:0},journalEntries:[],consultations:[],challengeTasks:tasks,challengeProgress:[],deepTalkTopics:[],isAuthenticated:true,getFamilyMembers:()=>({students:[],parents:[]}),getFilteredJournalsForUser:()=>[],setActiveTab(){},confirmChallengeTask(){},addParentReaction(){},openAuthModal(){}};
}
for(const [role,Component] of [['student',student.module.StudentDashboard],['parent',parent.module.ParentDashboard]]) {
 test(`${role} dashboard renders after login when Supabase has no challenge documents`,()=>{
  fixture(role);let html;
  try {html=renderToStaticMarkup(React.createElement(Component));}
  catch(error){assert.fail(`Dashboard render failed: ${error.message}`);}
  assert.match(html,/Chưa có thử thách được thiết lập/);
  assert.ok(!html.includes('Đánh dấu đã hoàn thành'));
  assert.ok(!html.includes('Xác nhận cha mẹ đã hoàn thành'));
 });
 test(`${role} dashboard still renders a real challenge when one exists`,()=>{
  fixture(role,[{day:1,title:'Synthetic challenge',description:'Synthetic task',stageName:'Synthetic stage',points:1,studentAction:'Student action',parentAction:'Parent action',icon:'*'}]);
  assert.match(renderToStaticMarkup(React.createElement(Component)),/Synthetic challenge/);
 });
}
