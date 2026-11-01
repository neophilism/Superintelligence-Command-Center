import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_NAV_WIDTH,MIN_NAV_WIDTH,MAX_NAV_WIDTH,layoutStorageKey,
 readNavWidth,saveNavWidth,keyboardNavWidth} from '../components/workspace-layout.mjs';
function storage(){const values=new Map();return {
 getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)
};}
test('per-domain workspace layout persists after another domain is selected and restored',()=>{
 const store=storage();
 saveNavWidth(store,'research',273);saveNavWidth(store,'music',342);
 assert.equal(readNavWidth(store,'research'),273);
 assert.equal(readNavWidth(store,'music'),342);
 assert.equal(readNavWidth(store,'code'),DEFAULT_NAV_WIDTH);
 assert.notEqual(layoutStorageKey('research'),layoutStorageKey('music'));
});
test('keyboard separator clamps, resets and allows large steps without pointer input',()=>{
 assert.equal(keyboardNavWidth(205,'ArrowLeft'),195);
 assert.equal(keyboardNavWidth(205,'ArrowRight',true),245);
 assert.equal(keyboardNavWidth(205,'Home'),MIN_NAV_WIDTH);
 assert.equal(keyboardNavWidth(205,'End'),MAX_NAV_WIDTH);
 assert.equal(keyboardNavWidth(205,'Tab'),null);
 assert.equal(keyboardNavWidth(MAX_NAV_WIDTH,'ArrowRight'),MAX_NAV_WIDTH);
 assert.equal(keyboardNavWidth(MIN_NAV_WIDTH,'ArrowLeft'),MIN_NAV_WIDTH);
});
test('invalid cached settings cannot create unsafe or unusable layouts',()=>{
 const store=storage();
 store.setItem(layoutStorageKey('research'),'{');
 assert.equal(readNavWidth(store,'research'),DEFAULT_NAV_WIDTH);
 store.setItem(layoutStorageKey('research'),'"10000"');
 assert.equal(readNavWidth(store,'research'),DEFAULT_NAV_WIDTH);
 store.setItem(layoutStorageKey('research'),'1000000');
 assert.equal(readNavWidth(store,'research'),MAX_NAV_WIDTH);
 assert.equal(saveNavWidth(store,'research',DEFAULT_NAV_WIDTH),205);
 assert.equal(readNavWidth(store,'research'),DEFAULT_NAV_WIDTH);
 assert.throws(()=>layoutStorageKey('../other'),/domain/);
 const denied={getItem:()=>{throw Error('storage disabled')},setItem:()=>{throw Error('storage disabled')}};
 assert.equal(readNavWidth(denied,'music'),DEFAULT_NAV_WIDTH);
 assert.equal(saveNavWidth(denied,'music',205),205);
});
