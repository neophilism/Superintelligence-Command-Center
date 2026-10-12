import test from 'node:test';import assert from 'node:assert/strict';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import ModelControls,{availableModels,isCompatible} from '../components/model-controls.mjs';
import {GET,sanitizeCatalog} from '../app/api/models/route.mjs';
const models=[
 {id:'m1',provider:'alpha',model:'text-1',revision:'r1',operations:['text.generate'],modalities:['text'],regions:['us'],licenseScope:'commercial',priceStatus:'known',healthStatus:'healthy',available:true,reasons:[]},
 {id:'m2',provider:'beta',model:'image-1',revision:'r1',operations:['image.generate'],modalities:['image'],regions:['us'],licenseScope:'personal',priceStatus:'unknown',healthStatus:'unknown',available:false,reasons:['price_unknown']}
];
test('model eligibility requires actual catalog availability and matching capability',()=>{
 assert.equal(isCompatible(models[0],'research'),true);
 assert.equal(isCompatible(models[0],'music'),false);
 assert.equal(availableModels(models,'research').length,1);
 assert.equal(availableModels(models,'image').length,0);
});
test('server catalog proxies real eligibility without claiming model price',async()=>{
 const fetchImpl=async url=>{assert.equal(new URL(url).pathname,'/v1/models');assert.equal(new URL(url).searchParams.get('usage'),'commercial');return {ok:true,json:async()=>({items:models})}};
 const res=await GET(new Request('https://command.test/api/models?usage=commercial'),{baseUrl:'https://engine.example',fetchImpl});
 assert.equal(res.status,200);assert.equal((await res.json()).items.length,2);
 assert.equal(sanitizeCatalog({items:models})[1].available,false);
 const noBackend=await GET(new Request('https://command.test/api/models'),{baseUrl:''});
 assert.equal(noBackend.status,503);assert.equal((await noBackend.json()).status,'unconfigured');
 const bad=await GET(new Request('https://command.test/api/models?usage=unrestricted'),{baseUrl:'https://engine.example'});
 assert.equal(bad.status,400);
});
test('control renders non-deceptive unconfigured state and no courseware',()=>{
 const html=renderToStaticMarkup(React.createElement(ModelControls,{domain:'code'}));
 assert.match(html,/Model controls/);assert.match(html,/Preferences are stored in this browser only/);assert.match(html,/No verified compatible models/);
 assert.doesNotMatch(html,/AI generation enabled|Start generation|Learn this control/);
});
