import test from 'node:test';
import assert from 'node:assert/strict';
import {mapLegacyUser,migrateLegacyUsers} from '../supabase/functions/migrate-codegenz/legacy-users.ts';
const source=[{id:'synthetic-1',name:'Synthetic',email:'synthetic@example.invalid',role:'admin',password:'Synthetic-private-password',family_id:'unresolved-family',family_role:'none',verified:true,permissions:{canManageUsers:true}}];
function adapter() {
 const profiles=new Map(),identities=new Map();let creates=0,failUpdate=false;
 const db={async rpc(_name,{target}){const row=[...profiles.values()].find(r=>r.auth_user_id===target);row.legacy_id=row.data.id;return {data:null,error:null}},from(table){let criteria=[],op='read',values;return {
 select(){return this},order(){return this},range(){return this},eq(k,v){criteria.push([k,v]);return this},
 update(v){op='update';values=v;return this},single(){this.one=true;return this},maybeSingle(){this.one=true;return this},
 then(resolve,reject){return Promise.resolve().then(()=>{
 if(table==='users')return {data:structuredClone(source),error:null};
 let matches=[...profiles.values()].filter(row=>criteria.every(([k,v])=>(k.startsWith('data->>')?row.data?.[k.slice(7)]:row[k])===v));
 if(op==='update') {if(failUpdate){failUpdate=false;return {error:{message:'synthetic failure'}};}matches.forEach(row=>Object.assign(row,JSON.parse(JSON.stringify(values))));}
 return {data:this.one?(matches[0]??null):matches,error:null};}).then(resolve,reject)}
 }},auth:{admin:{
 async createUser(input){creates++;const user={id:'auth-'+creates,email:input.email,app_metadata:input.app_metadata};identities.set(user.id,user);profiles.set(input.app_metadata.legacy_id,{auth_user_id:user.id,legacy_id:user.id,data:{id:user.id,email:user.email}});db.lastCreate=structuredClone(input);return {data:{user},error:null}},
 async getUserById(id){return {data:{user:identities.get(id)},error:null}},async updateUserById(){return {data:{},error:null}}
 }}};
 return {db,profiles,identities,creates:()=>creates,fail:()=>{failUpdate=true}};
}
test('profile mapping preserves source fields/roles and unresolved family IDs without credentials',()=>{
 const before=JSON.stringify(source);const row=mapLegacyUser(source[0]);assert.equal(row.familyId,'unresolved-family');assert.equal(row.family_id,'unresolved-family');assert.equal(row.role,'admin');assert.equal(row.password,undefined);assert.equal(row.mustChangePassword,true);assert.equal(JSON.stringify(source),before);
});
test('dry-run validates all source accounts without creating Auth accounts or exposing credentials',async()=>{
 const a=adapter();const result=await migrateLegacyUsers(a.db,{dryRun:true});assert.equal(result.sourceCount,1);assert.equal(a.creates(),0);assert.ok(!JSON.stringify(result).includes(source[0].password));
});
test('imports through Auth admin, keeps email unconfirmed, verifies content and is idempotent',async()=>{
 const a=adapter();await migrateLegacyUsers(a.db,{offset:0,limit:5});assert.equal(a.db.lastCreate.email_confirm,false);assert.equal(a.db.lastCreate.password,source[0].password);await migrateLegacyUsers(a.db,{offset:0,limit:5});assert.equal(a.creates(),1);const result=await migrateLegacyUsers(a.db,{verify:true});assert.equal(result.verified,1);assert.ok(!JSON.stringify(result).includes(source[0].password));
});
test('retry repairs a profile after Auth creation without recreating or changing credentials',async()=>{
 const a=adapter();a.fail();await assert.rejects(migrateLegacyUsers(a.db,{}));await migrateLegacyUsers(a.db,{});assert.equal(a.creates(),1);assert.equal((await migrateLegacyUsers(a.db,{verify:true})).verified,1);
});
test('conflicting Auth mapping is rejected without creating another identity',async()=>{
 const a=adapter();await migrateLegacyUsers(a.db,{});a.identities.get('auth-1').email='unrelated@example.invalid';await assert.rejects(migrateLegacyUsers(a.db,{}),/identity conflict/);assert.equal(a.creates(),1);
});
