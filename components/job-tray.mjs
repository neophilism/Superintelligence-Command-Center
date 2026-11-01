"use client";
import React,{useEffect,useState} from 'react';

const STATES=new Set(['queued','running','waiting_approval','completed','failed','cancelled']);
function bounded(value,max){return typeof value==='string'&&value.length>0&&value.length<=max?value:null}
export function normalizeRemoteRun(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Invalid job');
 const runId=bounded(raw.runId,128),projectId=bounded(raw.projectId,128);
 if(!runId||!projectId||!STATES.has(raw.state))throw new TypeError('Invalid run identity or state');
 const revision=raw.revision,elapsed=raw.elapsedSeconds,cost=raw.reconciledCostCents;
 if(!Number.isSafeInteger(revision)||revision<0)throw new TypeError('Invalid run revision');
 if(!Number.isSafeInteger(elapsed)||elapsed<0||elapsed>31536000)throw new TypeError('Invalid run duration');
 if(cost!==null&&(!Number.isSafeInteger(cost)||cost<0||cost>1000000000))
   throw new TypeError('Invalid verified cost');
 return Object.freeze({runId,projectId,revision,state:raw.state,elapsedSeconds:elapsed,
   provider:bounded(raw.provider,80)||'unknown',reconciledCostCents:cost,
   canCancel:raw.canCancel===true&&['queued','running','waiting_approval'].includes(raw.state),
   canRetry:raw.canRetry===true&&['failed','cancelled'].includes(raw.state)});
}
export function normalizeRunList(data){
 if(!data||!Array.isArray(data.items)||data.items.length>100)throw new TypeError('Invalid jobs response');
 const seen=new Set();
 return data.items.map(item=>normalizeRemoteRun(item)).filter(item=>{
   if(seen.has(item.runId))throw new TypeError('Duplicate run identifier');
   seen.add(item.runId);return true;
 });
}
/** Server is authoritative. Never overwrite its state with locally optimistic
 * cancelled, completed or billing claims, even after an action response. */
export function mergeAuthoritativeRuns(_local,serverData){return normalizeRunList(serverData)}
export function formatVerifiedCost(cents){
 return cents===null?'Not yet reconciled':(cents/100).toLocaleString('en-US',
   {style:'currency',currency:'USD'});
}
export function displayDuration(seconds){
 return Math.floor(seconds/3600)+'h '+Math.floor((seconds%3600)/60)+'m';
}
export default function JobTray({client=null}){
 const [status,setStatus]=useState(client?'loading':'unconfigured');
 const [runs,setRuns]=useState([]),[selected,setSelected]=useState(''),
   [busy,setBusy]=useState(''),[error,setError]=useState('');
 async function refresh(){
   if(!client){setStatus('unconfigured');return}
   setStatus('loading');setError('');
   try{
     const raw=await client.listRuns({limit:100});
     setRuns(previous=>mergeAuthoritativeRuns(previous,raw));
     setStatus('ready');
   }catch{setRuns([]);setStatus('unavailable');setError('Job states could not be verified from the engine.')}
 }
 useEffect(()=>{let live=true;if(!client){setStatus('unconfigured');return}
   client.listRuns({limit:100}).then(raw=>{
     if(!live)return;setRuns(normalizeRunList(raw));setStatus('ready');
   }).catch(()=>{if(live){setRuns([]);setStatus('unavailable')}});
   return()=>{live=false};
 },[client]);
 async function act(run,kind){
   if(!client||busy||!(kind==='cancel'?run.canCancel:run.canRetry))return;
   setBusy(run.runId);setError('');
   try{
     if(kind==='cancel')await client.cancelRun(run.runId,{expectedRevision:run.revision});
     else await client.retryRun(run.runId,{expectedRevision:run.revision});
     // Do not claim a new status until independently fetched from the server.
     await refresh();
   }catch{
     setError('Operation was not confirmed. Refresh job status before trying again.');
     try{await refresh();}catch{}
   }finally{setBusy('')}
 }
 const h=React.createElement;
 const selectedRun=runs.find(run=>run.runId===selected)||null;
 return h('section',{className:'job-tray','aria-label':'Background jobs'},
   h('header',null,h('h2',null,'Job tray'),
     h('button',{type:'button',disabled:!client||status==='loading',onClick:refresh},'Refresh')),
   status==='unconfigured'?h('p',{role:'status'},
     'Background run reattachment requires an authenticated SIE-017 engine adapter. No jobs are fabricated.'):
   status==='unavailable'?h('p',{role:'alert'},'Job service unavailable; no local job state is authoritative.'):
   h('p',{role:'status','aria-live':'polite'},status==='loading'?'Refreshing server jobs':
     runs.length+' jobs loaded from authenticated engine'),
   error?h('p',{role:'alert'},error):null,
   status==='ready'?h('div',{className:'job-tray-layout'},
     h('ul',{'aria-label':'Verified engine runs'},
       ...runs.map(run=>h('li',{key:run.runId},
         h('button',{type:'button','aria-current':selected===run.runId?'true':undefined,
           onClick:()=>setSelected(run.runId)},run.projectId+' · '+run.state+' · '+run.provider)))),
     h('div',{className:'job-tray-inspector',role:'region','aria-label':'Selected job details'},
       selectedRun?h(React.Fragment,null,
         h('h3',null,'Run '+selectedRun.runId),
         h('p',null,'Project: '+selectedRun.projectId),
         h('p',null,'State: '+selectedRun.state),
         h('p',null,'Provider: '+selectedRun.provider),
         h('p',null,'Elapsed: '+displayDuration(selectedRun.elapsedSeconds)),
         h('p',null,'Verified cost: '+formatVerifiedCost(selectedRun.reconciledCostCents)),
         h('button',{type:'button',disabled:!selectedRun.canCancel||!!busy,
           onClick:()=>act(selectedRun,'cancel')},'Request cancellation'),
         h('button',{type:'button',disabled:!selectedRun.canRetry||!!busy,
           onClick:()=>act(selectedRun,'retry')},'Request retry'),
         h('p',{className:'job-tray-disclaimer'},'Actions update only when independently confirmed by the engine.'))
        :h('p',null,'Select a verified job to inspect its status and provider.'))):null);
}
