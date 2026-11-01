"use client";
import React,{useEffect,useState} from 'react';

/** No hidden prompts, user content, tokens or private asset URLs are copied. */
export function safeRevisionMetadata(raw){
 if(!raw||!Number.isSafeInteger(raw.revision)||raw.revision<0)
   throw new TypeError('Immutable revision required');
 const text=(value,max=160)=>typeof value==='string'&&value.length<=max?value:'';
 return Object.freeze({revision:raw.revision,mediaType:text(raw.mediaType)||'unknown',
   checksum:text(raw.checksum)||'not supplied',
   parentRevision:Number.isSafeInteger(raw.parentRevision)&&raw.parentRevision>=0?
     raw.parentRevision:null,
   modelId:text(raw.modelId)||'not supplied',
   toolId:text(raw.toolId)||'not supplied',
   sourceId:text(raw.sourceId)||'not supplied',
   license:text(raw.licenseScope)||'not supplied',
   promptDigest:text(raw.promptDigest)||'not supplied'});
}
export function revisionMetadataDiff(left,right){
 const a=safeRevisionMetadata(left),b=safeRevisionMetadata(right);
 const fields=['mediaType','checksum','parentRevision','modelId','toolId','sourceId',
   'license','promptDigest'];
 return fields.map(field=>({field,left:String(a[field]??'not supplied'),
   right:String(b[field]??'not supplied'),changed:a[field]!==b[field]}));
}
/** This only asks an injected, authorized remote implementation to restore;
 * never rewrites immutable history or asserts the operation succeeded based
 * on the command's response alone. */
export async function restoreAsNewRevision(adapter,{tenantId,projectId,artifactId,
 sourceRevision,expectedHeadRevision}){
 if(!adapter||typeof adapter.restoreAsNewRevision!=='function'||
   typeof adapter.listRevisions!=='function')throw new TypeError('Verified restore adapter required');
 for(const value of [tenantId,projectId,artifactId]){
   if(typeof value!=='string'||!value||value.length>128)
     throw new TypeError('Valid scoped artifact IDs required');
 }
 for(const value of [sourceRevision,expectedHeadRevision]){
   if(!Number.isSafeInteger(value)||value<0)throw new TypeError('Valid revision IDs required');
 }
 const before=await adapter.listRevisions({tenantId,projectId,artifactId});
 if(!Array.isArray(before)||before.length>10000||
   !before.some(v=>v.revision===sourceRevision)||
   !before.some(v=>v.revision===expectedHeadRevision))
   throw new Error('RESTORE_REVISION_NOT_VISIBLE');
 if(expectedHeadRevision!==Math.max(...before.map(v=>v.revision)))
   throw new Error('RESTORE_STALE_HEAD');
 const receipt=await adapter.restoreAsNewRevision({tenantId,projectId,artifactId,
   sourceRevision,expectedHeadRevision});
 if(!Number.isSafeInteger(receipt?.newRevision)||receipt.newRevision<=expectedHeadRevision)
   throw new Error('RESTORE_RECEIPT_NOT_VERIFIED');
 const after=await adapter.listRevisions({tenantId,projectId,artifactId});
 if(!Array.isArray(after)||after.length>10000)
   throw new Error('RESTORE_NOT_INDEPENDENTLY_VERIFIED');
 const created=after.find(v=>v.revision===receipt.newRevision);
 if(!created||created.parentRevision!==expectedHeadRevision||
   created.restoredFromRevision!==sourceRevision||
   !before.every(previous=>after.some(value=>
     value.revision===previous.revision&&value.checksum===previous.checksum)))
   throw new Error('RESTORE_NOT_INDEPENDENTLY_VERIFIED');
 return {createdRevision:created.revision,nonDestructive:true};
}
export default function ArtifactCompare({versions=[],onRestore=null}){
 const [left,setLeft]=useState(''),[right,setRight]=useState(''),[error,setError]=useState('');
 const revisions=versions.filter(item=>Number.isSafeInteger(item.revision));
 useEffect(()=>{setLeft(String(revisions[0]?.revision??''));
   setRight(String(revisions[1]?.revision??revisions[0]?.revision??''));setError('');
 },[versions]);
 const a=revisions.find(v=>String(v.revision)===left),
   b=revisions.find(v=>String(v.revision)===right);
 const h=React.createElement;
 return h('section',{className:'artifact-compare','aria-label':'Artifact revision comparison'},
   h('h4',null,'Compare immutable revisions'),
   revisions.length<2?h('p',null,'Two revisions are required for comparison.'):
   h(React.Fragment,null,
     h('div',{className:'artifact-compare-choices'},
       h('label',null,'First revision',h('select',{value:left,
         onChange:e=>setLeft(e.target.value)},...revisions.map(v=>
         h('option',{key:v.revision,value:String(v.revision)},'Revision '+v.revision)))),
       h('label',null,'Second revision',h('select',{value:right,
         onChange:e=>setRight(e.target.value)},...revisions.map(v=>
         h('option',{key:v.revision,value:String(v.revision)},'Revision '+v.revision))))),
     a&&b?h('table',null,
       h('caption',null,'Metadata and provenance differences, not full media contents'),
       h('thead',null,h('tr',null,h('th',null,'Field'),h('th',null,'First'),
         h('th',null,'Second'))),
       h('tbody',null,...revisionMetadataDiff(a,b).map(item=>h('tr',{key:item.field,
         'data-changed':item.changed?'true':'false'},
         h('th',{scope:'row'},item.field),h('td',null,item.left),
         h('td',null,item.right))))):null,
     h('button',{type:'button',disabled:!onRestore||!a,
       onClick:async()=>{if(!onRestore||!a)return;setError('');
         try{await onRestore(a.revision)}catch{setError('Restore was not verified; history unchanged locally.')}}},
       onRestore?'Restore selected as a new revision':'Restore unavailable without verified engine'),
     error?h('p',{role:'alert'},error):null
   ));
}
