import test from 'node:test';
import assert from 'node:assert/strict';
import {selectContext} from '../lib/context.mjs';
test('retrieval prefers relevant memories and bounds provider input',()=>{const entries=Array.from({length:100},(_,i)=>({id:String(i),kind:'memory',updated_at:'2026-11-10',data:{title:i===42?'Tunisia savings goal':'Other fact',body:'x'.repeat(8000),source:'owner'}}));const context=selectContext(entries,'Tunisia savings',40,5000);assert.equal(context.records[0].id,'42');assert.ok(context.records.every(e=>e.data.body.length<=1500));assert.ok(JSON.stringify(context.records).length<5100);assert.ok(context.omitted>0);});
test('private document contents are not silently included in AI requests',()=>{assert.equal(selectContext([{id:'secret',kind:'document',data:{title:'Passport'}}],'Passport').records.length,0);});
