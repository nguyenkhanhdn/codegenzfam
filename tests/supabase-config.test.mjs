import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSupabaseConfig,authErrorMessage} from '../src/services/supabaseConfig.ts';

test('anon configuration is used by the shared client and account endpoint',()=>{
  assert.deepEqual(resolveSupabaseConfig({VITE_SUPABASE_URL:'https://test.supabase.co/',VITE_SUPABASE_ANON_KEY:'public-anon'}),{url:'https://test.supabase.co',key:'public-anon'});
});
test('publishable keys take precedence over legacy anon configuration',()=>{
  assert.equal(resolveSupabaseConfig({VITE_SUPABASE_PUBLISHABLE_KEY:'public-publishable',VITE_SUPABASE_ANON_KEY:'public-anon'}).key,'public-publishable');
});
test('confirmation and network errors are not reported as an incorrect password',()=>{
  assert.match(authErrorMessage({code:'email_not_confirmed'}),/chưa được quản trị viên phê duyệt/);
  assert.match(authErrorMessage({status:0}),/Chưa kết nối/);
  assert.match(authErrorMessage({code:'user_banned'}),/bị khóa/);
  assert.match(authErrorMessage({code:'over_request_rate_limit'}),/chờ/);
});
