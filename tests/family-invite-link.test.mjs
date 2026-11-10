import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {buildFamilyInviteUrl,readPendingFamilyInvite,clearPendingFamilyInvite} from '../src/services/familyInviteLink.ts';
test('QR invitation keeps its family through login/reload and clears on completion', () => {
 const store=new Map();let replaced;
 globalThis.window={location:{href:'https://codegenzfam.vercel.app/?join=code-8899'},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},history:{state:null,replaceState:(_s,_t,url)=>{replaced=url;}}};
 try {
  assert.equal(buildFamilyInviteUrl('CODE-8899'),'https://codegenzfam.vercel.app/?join=CODE-8899');
  assert.equal(readPendingFamilyInvite(),'CODE-8899');
  window.location.href='https://codegenzfam.vercel.app/'; // auth redirect without invite parameters
  assert.equal(readPendingFamilyInvite(),'CODE-8899');
  window.location.href='https://codegenzfam.vercel.app/?join=CODE-8899&keep=yes';
  clearPendingFamilyInvite(); assert.equal(store.size,0);assert.equal(replaced,'/?keep=yes');
  window.location.href='https://codegenzfam.vercel.app/';assert.equal(readPendingFamilyInvite(),'');
  window.location.href='https://codegenzfam.vercel.app/?join=https://evil.example';assert.equal(readPendingFamilyInvite(),'');
 } finally {delete globalThis.window;}
});
test('QR data URL can be generated for the actual invitation rather than homepage',async()=>{
 const link=buildFamilyInviteUrl('CODE-8899');
 const qr=await QRCode.toDataURL(link,{width:480,margin:4,errorCorrectionLevel:'M'});
 assert.match(qr,/^data:image\/png;base64,/);
});
