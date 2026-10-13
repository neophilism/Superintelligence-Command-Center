"use client";
import React,{useEffect,useMemo,useState} from 'react';
import {ProjectPortalClient} from '../vendor/engine/packages/ui/src/project-portal.mjs';

export const WORKSPACE_KINDS=['code','music','poetry','persuasive-writing','research','legislation','image','video','voice','data','workflow'];

export function searchProjects(projects,query){
 const q=String(query||'').trim().toLocaleLowerCase();
 return [...projects].filter(p=>[p.title,p.kind,p.id].some(v=>String(v||'').toLocaleLowerCase().includes(q))).sort((a,b)=>a.title.localeCompare(b.title));
}
export function describeRevision(item){
 return 'Revision '+item.revision+' · '+(item.mediaType||'unknown media')+' · checksum '+(item.checksum||'not supplied');
}
export function prepareProjectUpdate(project,{title,kind}={}){
 const nextTitle=String(title||'').trim();
 if(!project||!Number.isSafeInteger(project.revision)||project.revision<1)throw new TypeError('Current project revision required');
 if(!nextTitle)throw new TypeError('Project title required');
 if(!WORKSPACE_KINDS.includes(kind))throw new TypeError('Supported workspace kind required');
 return {expectedRevision:project.revision,title:nextTitle,kind};
}
export function updateProjectMetadata(client,tenantId,project,changes){
 if(!client||typeof client.request!=='function')throw new TypeError('Project portal client required');
 return client.request('/v1/projects/'+project.id,{tenantId,method:'PATCH',body:prepareProjectUpdate(project,changes)});
}

export default function ProjectExplorer({engineOrigin='',onOpenProject=()=>{}}){
 const client=useMemo(()=>{try{return new ProjectPortalClient({engineOrigin,product:'command'})}catch{return null}},[engineOrigin]);
 const [status,setStatus]=useState(client?'checking':'unconfigured');
 const [organizations,setOrganizations]=useState([]);
 const [tenant,setTenant]=useState('');
 const [projects,setProjects]=useState([]);
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState(null);
 const [artifacts,setArtifacts]=useState([]);
 const [artifact,setArtifact]=useState('');
 const [versions,setVersions]=useState([]);
 const [editTitle,setEditTitle]=useState('');
 const [editKind,setEditKind]=useState('research');
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');

 useEffect(()=>{if(!client){setStatus('unconfigured');return}let live=true;
  client.session().then(()=>client.tenants()).then(data=>{if(!live)return;const items=Array.isArray(data.items)?data.items:[];setOrganizations(items);setTenant(items[0]?.id||'');setStatus('ready');}).catch(e=>{if(live){setStatus(e.status===401?'signed-out':'unavailable')}});return()=>{live=false}},[client]);
 useEffect(()=>{if(!tenant||!client){setProjects([]);return}let live=true;setSelected(null);setArtifacts([]);setError('');client.projects(tenant).then(data=>{if(live)setProjects(Array.isArray(data.items)?data.items:[])}).catch(()=>{if(live){setError('Project list unavailable');setProjects([])}});return()=>{live=false}},[client,tenant]);
 useEffect(()=>{if(!client||!tenant||!selected){setArtifacts([]);return}let live=true;setArtifact('');setVersions([]);client.artifacts(tenant,selected.id).then(data=>{if(live)setArtifacts(Array.isArray(data.items)?data.items:[])}).catch(()=>{if(live){setArtifacts([]);setError('Artifact list unavailable')}});return()=>{live=false}},[client,tenant,selected?.id]);
 useEffect(()=>{if(!client||!tenant||!selected||!artifact){setVersions([]);return}let live=true;client.revisions(tenant,selected.id,artifact).then(data=>{if(live)setVersions(Array.isArray(data.items)?data.items:[])}).catch(()=>{if(live){setVersions([]);setError('Revision history unavailable')}});return()=>{live=false}},[client,tenant,selected?.id,artifact]);

 function choose(project){
  setSelected(project);setEditTitle(project.title);setEditKind(project.kind);setError('');onOpenProject(project);
 }
 async function saveMetadata(event){
  event.preventDefault();
  if(!client||!tenant||!selected||saving)return;
  let body;
  try{body=prepareProjectUpdate(selected,{title:editTitle,kind:editKind})}catch(err){setError(err.message);return}
  if(body.title===selected.title&&body.kind===selected.kind)return;
  const original=selected,optimistic={...original,title:body.title,kind:body.kind,revision:original.revision+1};
  setSaving(true);setError('');setSelected(optimistic);setProjects(items=>items.map(item=>item.id===original.id?optimistic:item));
  try{
   const updated=await updateProjectMetadata(client,tenant,original,body);
   setProjects(items=>items.map(item=>item.id===updated.id?updated:item));
   setSelected(current=>current?.id===updated.id?updated:current);
   setEditTitle(updated.title);setEditKind(updated.kind);
  }catch(err){
   setProjects(items=>items.map(item=>item.id===original.id?original:item));
   setSelected(current=>current?.id===original.id?original:current);
   if(err?.status===409||err?.code==='revision_conflict'){
    try{
     const data=await client.projects(tenant),items=Array.isArray(data.items)?data.items:[];
     const latest=items.find(item=>item.id===original.id)||null;
     setProjects(items);setSelected(latest);
     if(latest){setEditTitle(latest.title);setEditKind(latest.kind)}
    }catch{}
    setError('Project changed elsewhere. Latest metadata was reloaded; review it before saving again.');
   }else setError('Project metadata was not saved. No server data was overwritten.');
  }finally{setSaving(false)}
 }

 const h=React.createElement,results=searchProjects(projects,query);
 return h('section',{className:'professional-explorer','aria-label':'Project explorer'},
  h('header',null,h('h2',null,'Project explorer'),h('span',{role:'status','aria-live':'polite'},status)),
  status==='ready'?h(React.Fragment,null,
   h('label',null,'Organization',h('select',{value:tenant,onChange:e=>{setTenant(e.target.value);setError('')}},...organizations.map(o=>h('option',{value:o.id,key:o.id},o.name)))),
   h('label',null,'Search projects',h('input',{type:'search',value:query,onChange:e=>setQuery(e.target.value),placeholder:'Name, type, or ID'})),
   h('div',{className:'professional-explorer-grid'},
    h('div',{'aria-label':'Matching projects',className:'professional-explorer-list'},
     ...results.map(p=>h('button',{type:'button',key:p.id,'aria-current':selected?.id===p.id?'true':undefined,onClick:()=>choose(p)},h('strong',null,p.title),h('small',null,p.kind+' · '+p.id))),
     !results.length?h('p',null,'No matching projects'):null),
    h('div',{className:'professional-explorer-details','aria-label':'Project details'},
     selected?h(React.Fragment,null,
      h('h3',null,selected.title),
      h('p',null,'Project '+selected.id+' · revision '+selected.revision),
      h('form',{className:'professional-project-metadata',onSubmit:saveMetadata},
       h('label',null,'Project title',h('input',{value:editTitle,maxLength:256,required:true,onChange:e=>setEditTitle(e.target.value)})),
       h('label',null,'Workspace kind',h('select',{value:editKind,onChange:e=>setEditKind(e.target.value)},...Array.from(new Set([selected.kind,...WORKSPACE_KINDS])).map(kind=>h('option',{key:kind,value:kind},kind)))),
       h('button',{type:'submit',disabled:saving||!editTitle.trim()},saving?'Saving…':'Save metadata')),
      h('h4',null,'Artifacts'),
      ...artifacts.map(a=>h('button',{key:a.id,type:'button',onClick:()=>setArtifact(a.id),'aria-current':artifact===a.id?'true':undefined},a.mediaType+' · '+a.id)),
      artifact?h('div',null,h('h4',null,'Immutable revision history'),...versions.map((v,i)=>h('p',{key:String(v.revision)+'-'+i},describeRevision(v)))):null)
     :h('p',null,'Select a project to inspect its artifacts and versions.'))))
  :h('p',null,status==='unconfigured'?'Configure the engine origin to access projects.':status==='signed-out'?'Sign in using the shared project portal.':'Project explorer is currently unavailable.'),
  error?h('p',{role:'alert'},error):null);
}
