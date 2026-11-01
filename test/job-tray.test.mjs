import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import JobTray,{normalizeRemoteRun,normalizeRunList,mergeAuthoritativeRuns,
 formatVerifiedCost,displayDuration,fetchVerifiedRuns,applyVerifiedJobAction} from '../components/job-tray.mjs';

const run={runId:'run-123',projectId:'project-456',revision:9,state:'running',
 elapsedSeconds:3661,provider:'provider',reconciledCostCents:null,canCancel:true,canRetry:false};
test('run states come only from validated server response, no invented cost',()=>{
 const valid=normalizeRemoteRun(run);
 assert.equal(valid.state,'running');assert.equal(valid.canCancel,true);
 assert.equal(valid.canRetry,false);assert.equal(formatVerifiedCost(valid.reconciledCostCents),
   'Not yet reconciled');
 assert.match(formatVerifiedCost(145),/1\.45/);
 assert.equal(displayDuration(3661),'1h 1m');
 assert.equal(Object.keys(valid).includes('prompt'),false);
});
test('cancel/retry affordances reflect current server state and permissions',()=>{
 assert.equal(normalizeRemoteRun({...run,state:'completed',canCancel:true}).canCancel,false);
 assert.equal(normalizeRemoteRun({...run,state:'failed',canRetry:true}).canRetry,true);
 assert.equal(normalizeRemoteRun({...run,state:'failed',canRetry:false}).canRetry,false);
 assert.throws(()=>normalizeRemoteRun({...run,state:'success'}),/Invalid run/);
 assert.throws(()=>normalizeRemoteRun({...run,reconciledCostCents:-100}),/cost/);
 assert.throws(()=>normalizeRemoteRun({...run,revision:-1}),/revision/);
});
test('authoritative refresh overrides optimistic local status',()=>{
 const previous=[normalizeRemoteRun({...run,state:'running'})];
 const updated=mergeAuthoritativeRuns(previous,{items:[{...run,state:'cancelled',canCancel:true}]});
 assert.equal(updated[0].state,'cancelled');assert.equal(updated[0].canCancel,false);
 assert.throws(()=>normalizeRunList({items:[run,run]}),/Duplicate run/);
});
test('no synthetic background tasks appear without a configured engine',()=>{
 const html=renderToStaticMarkup(React.createElement(JobTray,{client:null}));
 assert.match(html,/requires an authenticated SIE-017 engine adapter/);
 assert.doesNotMatch(html,/project-456/);
 assert.doesNotMatch(html,/Request cancellation/);
});

test('server-backed job relaunch reattaches and cancellation reflects actual worker state',async()=>{
 let current={...run};
 const calls=[];
 const client={
  listRuns:async()=>({items:[current]}),
  cancelRun:async(id,{expectedRevision})=>{
   calls.push({id,expectedRevision});
   if(id!==current.runId||expectedRevision!==current.revision)
     throw Error('revision_conflict');
   current={...current,revision:current.revision+1,state:'cancelled',canCancel:false};
  }
 };
 const firstMount=await fetchVerifiedRuns(client);
 assert.equal(firstMount[0].state,'running');
 const result=await applyVerifiedJobAction(client,firstMount[0],'cancel');
 assert.equal(result[0].state,'cancelled');
 const reopenedMount=await fetchVerifiedRuns(client);
 assert.equal(reopenedMount[0].state,'cancelled');
 assert.deepEqual(calls,[{id:'run-123',expectedRevision:9}]);
 await assert.rejects(applyVerifiedJobAction(client,firstMount[0],'cancel'),/revision_conflict/);
});
test('server denied cancel and unknown action never report success',async()=>{
 const client={
  listRuns:async()=>({items:[run]}),
  cancelRun:async()=>{throw Error('DENIED')}
 };
 const fresh=(await fetchVerifiedRuns(client))[0];
 await assert.rejects(applyVerifiedJobAction(client,fresh,'cancel'),/DENIED/);
 assert.equal((await fetchVerifiedRuns(client))[0].state,'running');
 await assert.rejects(applyVerifiedJobAction(client,fresh,'reboot'),/Invalid job action/);
});
