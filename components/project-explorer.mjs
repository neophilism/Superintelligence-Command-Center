"use client";
import React,{useEffect,useMemo,useState} from 'react';
import {WORKSPACE_DOMAINS} from '@superintelligence/ui';
import {ProjectPortalClient} from '../vendor/engine/packages/ui/src/project-portal.mjs';
export function searchProjects(projects,query){
 const q=String(query||'').trim().toLocaleLowerCase();
 return [...projects].filter(p=>[p.title,p.kind,p.id].some(v=>String(v||'').toLocaleLowerCase().includes(q))).sort((a,b)=>a.title.localeCompare(b.title));
}
export function describeRevision(item){
 return 'Revision '+item.revision+' · '+(item.mediaType||'unknown media')+' · checksum '+(item.checksum||'not supplied');
}
export function updateProjectMetadata(client,tenant,project,{title,kind}){
 if(!client||!tenant||!project||!Number.isSafeInteger(project.revision))throw new TypeError('Current project revision required');
 const nextTitle=String(title||'').trim();
 if(!nextTitle||!WORKSPACE_DOMAINS.includes(kind))throw new TypeError('Valid project metadata required');
 return client.request('/v1/projects/'+project.id,{tenantId:tenant,method:'PATCH',body:{expectedRevision:project.revision,title:nextTitle,kind}});
}
export default function ProjectExplorer({engineOrigin='',onOpenProject=()=>{}}){
 const client=useMemo(()=>{try{return new ProjectPortalClient({engineOrigin,product:'command'})}catch{return null}},[engineOrigin]);
 const [status,setStatus]=useState(client?'checking':'unconfigured'),[organizations,setOrganizations]=useState([]),[tenant,setTenant]=useState(''),[projects,setProjects]=useState([]),[query,setQuery]=useState(''),[selected,setSelected]=useState(null),[artifacts,setArtifacts]=useState([]),[artifact,setArtifact]=useState(''),[versions,setVersions]=useState([]),[editTitle,setEditTitle]=useState(''),[editKind,setEditKind]=useState('research'),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!client){setStatus('unconfigured');return}let live=true;
 client.session().then(()=>client.tenants()).then(data=>{if(!live)return;const items=Array.isArray(data.items)?data.items:[];setOrganizations(items);setTenant(items[0]?.id||'');setStatus('ready');}).catch(e=>{if(live){setStatus(e.status===401?'signed-out':'unavailable')}});return()=>{live=false}},[client]);
 useEffect(()=>{if(!tenant||!client){setProjects([]);return}let live=true;setSelected(null);setArtifacts([]);client.projects(tenant).then(data=>{if(live)setProjects(Array.isArray(data.items)?data.items:[])}).catch(()=>{if(live){setError('Project list unavailable');setProjects([])}});return()=>{live=false}},[client,tenant]);
 useEffect(()=>{if(!client||!tenant||!selected){setArtifacts([]);return}let live=true;setArtifact('');setVersions([]);client.artifacts(tenant,selected.id).then(data=>{if(live)setArtifacts(Array.isArray(data.items)?data.items:[])}).catch(()=>{if(live){setArtifacts([]);setError('Artifact list unavailable')}});return()=>{live=false}},[client,tenant,selected]);
 useEffect(()=>{if(!client||!tenant||!selected||!artifact){setVersions([]);return}let live=true;client.revisions(tenant,selected.id,artifact).then(data=>{if(live)setVersions(Array.isArray(data.items)?data.items:[])}).catch(()=>{if(live){setVersions([]);setError('Revision history unavailable')}});return()=>{live=false}},[client,tenant,selected,artifact]);
 async function saveMetadata(event){
  event.preventDefault();if(!client||!tenant||!selected||saving)return;setSaving(true);setError('');
  try{
   const updated=await updateProjectMetadata(client,tenant,selected,{title:editTitle,kind:editKind});
   setProjects(items=>items.map(item=>item.id===updated.id?updated:item));setSelected(updated);onOpenProject(updated);
  }catch(err){
   if(err.code==='revision_conflict'){
    try{const fresh=await client.projects(tenant),items=Array.isArray(fresh.items)?fresh.items:[],current=items.find(item=>item.id===selected.id)||null;setProjects(items);setSelected(current);if(current){setEditTitle(current.title);setEditKind(current.kind)}}
    catch{}
    setError('Project changed elsewhere. Latest metadata was loaded; review it before saving again.');
   }else setError('Project update failed: '+(err.code||'unavailable'));
  }finally{setSaving(false)}
 }
 function chooseProject(project){setSelected(project);setEditTitle(project.title);setEditKind(project.kind);setError('');onOpenProject(project)}
 const h=React.createElement,results=searchProjects(projects,query);
 return h('section',{className:'professional-explorer','aria-label':'Project explorer'},
 h('header',null,h('h2',null,'Project explorer'),h('span',{role:'status'},status)),
 status==='ready'?h(React.Fragment,null,
 h('label',null,'Organization',h('select',{value:tenant,onChange:e=>{setTenant(e.target.value);setError('')}},...organizations.map(o=>h('option',{value:o.id,key:o.id},o.name)))),
 h('label',null,'Search projects',h('input',{type:'search',value:query,onChange:e=>setQuery(e.target.value),placeholder:'Name, type, or ID'})),
 h('div',{className:'professional-explorer-grid'},h('div',{'aria-label':'Matching projects',className:'professional-explorer-list'},
 ...results.map(p=>h('button',{type:'button',key:p.id,'aria-current':selected?.id===p.id?'true':undefined,onClick:()=>chooseProject(p)},h('strong',null,p.title),h('small',null,p.kind+' · '+p.id))),
 !results.length?h('p',null,'No matching projects'):null),
 h('div',{className:'professional-explorer-details','aria-label':'Project details'},
 selected?h(React.Fragment,null,h('h3',null,selected.title),h('p',null,'Project '+selected.id+' · revision '+selected.revision),
 h('form',{className:'professional-explorer-editor',onSubmit:saveMetadata,'aria-label':'Edit project metadata'},
 h('label',null,'Project title',h('input',{value:editTitle,maxLength:256,required:true,onChange:e=>setEditTitle(e.target.value)})),
 h('label',null,'Workspace type',h('select',{value:editKind,onChange:e=>setEditKind(e.target.value)},...WORKSPACE_DOMAINS.map(kind=>h('option',{key:kind,value:kind},kind))),
 h('button',{type:'submit',disabled:saving||!editTitle.trim()},saving?'Saving…':'Save metadata')),
 h('h4',null,'Artifacts'),
 ...artifacts.map(a=>h('button',{key:a.id,type:'button',onClick:()=>setArtifact(a.id),'aria-current':artifact===a.id?'true':undefined},a.mediaType+' · '+a.id)),
 artifact?h('div',null,h('h4',null,'Immutable revision history'),...versions.map((v,i)=>h('p',{key:String(v.revision)+'-'+i},describeRevision(v)))):null):h('p',null,'Select a project to inspect its artifacts and versions.')))):h('p',null,status==='unconfigured'?'Configure the engine origin to access projects.':status==='signed-out'?'Sign in using the shared project portal.':'Project explorer is currently unavailable.'),
 error?h('p',{role:'alert'},error):null);
}
