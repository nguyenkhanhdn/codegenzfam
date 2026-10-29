import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmSystemAdministrators} from '../supabase/functions/migrate-codegenz/approval-rollout.ts';
test('rollout queries active server-side admin roles and confirms only matching identities',async()=>{
 const filters=[],calls=[];
 const db={from(){return {select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},range(){return Promise.resolve({data:[{auth_user_id:'synthetic-admin',data:{role:'admin',status:'active'}}],error:null})}}},auth:{admin:{async updateUserById(id,patch){calls.push({id,patch});return {data:{user:{email_confirmed_at:'2026-10-29T00:00:00Z'}},error:null}}}}};
 assert.deepEqual(await confirmSystemAdministrators(db),{administratorsConfirmed:1});
 assert.deepEqual(filters,[['data->>role','admin'],['data->>status','active']]);
 assert.deepEqual(calls,[{id:'synthetic-admin',patch:{email_confirm:true}}]);
});
