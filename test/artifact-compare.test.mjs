import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ArtifactCompare,{safeRevisionMetadata,revisionMetadataDiff,restoreAsNewRevision} from '../components/artifact-compare.mjs';
const old={revision:1,mediaType:'text/plain',checksum:'hash-a',parentRevision:0,
 modelId:'model',toolId:'tool',sourceId:'source',licenseScope:'personal'};
const newer={revision:2,mediaType:'image/png',checksum:'hash-b',parentRevision:1,
 modelId:'model-two',toolId:'tool',sourceId:'source',licenseScope:'commercial'};
test('provenance comparison only displays allowed fields and changes',()=>{
 const diff=revisionMetadataDiff(old,newer);
 assert.ok(diff.some(item=>item.field==='checksum'&&item.changed));
 assert.ok(diff.some(item=>item.field==='license'&&item.changed));
 assert.ok(diff.some(item=>item.field==='toolId'&&!item.changed));
 const summary=safeRevisionMetadata({...newer,prompt:'private secret',token:'secret'});
 assert.equal(Object.keys(summary).includes('prompt'),false);
 assert.equal(Object.keys(summary).includes('token'),false);
 assert.throws(()=>safeRevisionMetadata({...old,revision:-1}),/revision/);
});
test('comparison is readable but restoring is disabled without verified backend',()=>{
 const html=renderToStaticMarkup(React.createElement(ArtifactCompare,{versions:[old,newer]}));
 assert.match(html,/Compare immutable revisions/);
 assert.match(html,/Restore unavailable without verified engine/);
 assert.match(html,/disabled/);
 assert.doesNotMatch(html,/private secret/);
});
test('restore preserves both old revisions and creates a separately verified new head',async()=>{
 let versions=[old,newer],attempts=0;
 const adapter={
  listRevisions:async()=>versions,
  restoreAsNewRevision:async({sourceRevision,expectedHeadRevision})=>{
   attempts++;
   assert.equal(sourceRevision,1);assert.equal(expectedHeadRevision,2);
   versions=[...versions,{...old,revision:3,parentRevision:2,restoredFromRevision:1}];
   return {newRevision:3};
  }
 };
 const result=await restoreAsNewRevision(adapter,{tenantId:'org',projectId:'project',
   artifactId:'artifact',sourceRevision:1,expectedHeadRevision:2});
 assert.deepEqual(result,{createdRevision:3,nonDestructive:true});
 assert.equal(attempts,1);
 assert.equal(versions.length,3);
});
test('stale restore, unverifiable overwrite or unavailable engine fails closed',async()=>{
 const scope={tenantId:'org',projectId:'project',artifactId:'artifact',
   sourceRevision:1,expectedHeadRevision:2};
 await assert.rejects(restoreAsNewRevision(null,scope),/adapter/);
 const stale={listRevisions:async()=>[old,newer,{...newer,revision:3}],
   restoreAsNewRevision:async()=>{throw Error('must not be called')}};
 await assert.rejects(restoreAsNewRevision(stale,scope),/STALE_HEAD/);
 const destructive={listRevisions:(()=>{let calls=0;return async()=>{
   calls++;return calls===1?[old,newer]:[{...newer,revision:3}];}})(),
   restoreAsNewRevision:async()=>({newRevision:3})};
 await assert.rejects(restoreAsNewRevision(destructive,scope),/NOT_INDEPENDENTLY_VERIFIED/);
});

test('unrelated concurrent new head cannot be mistaken for restored source',async()=>{
 const oldHead={...newer,revision:2};
 const other={...newer,revision:3,parentRevision:2,restoredFromRevision:999};
 const client={listRevisions:async()=>[old,oldHead,other],
  restoreAsNewRevision:async()=>({newRevision:3})};
 await assert.rejects(restoreAsNewRevision(client,{tenantId:'org',projectId:'project',
  artifactId:'artifact',sourceRevision:1,expectedHeadRevision:3}),/RESTORE_RECEIPT_NOT_VERIFIED/);
});
