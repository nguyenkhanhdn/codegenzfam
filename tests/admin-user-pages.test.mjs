import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAdminUserPages} from '../src/services/adminUsers.ts';
test('admin queue loading includes pending accounts beyond the first page',async()=>{
 const offsets=[];
 const users=await loadAdminUserPages(async(action,{offset})=>{
  assert.equal(action,'list');offsets.push(offset);
  return {users:offset===0?Array.from({length:200},(_,i)=>({id:'synthetic-'+i,status:'active'})):[{id:'pending-last',status:'pending'}]};
 });
 assert.deepEqual(offsets,[0,200]);assert.equal(users.length,201);assert.equal(users.at(-1).status,'pending');
});
test('failed admin listing is surfaced instead of reporting a partial or empty queue',async()=>{
 await assert.rejects(loadAdminUserPages(async()=>{throw new Error('synthetic access denial')}),/access denial/);
 await assert.rejects(loadAdminUserPages(async()=>({users:null})),/không hợp lệ/);
});
