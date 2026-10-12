"use client";
import React,{useEffect,useRef,useState} from 'react';
import {WORKSPACE_DOMAINS} from '@superintelligence/ui';

const LABELS=Object.freeze({
 code:'Code & full-stack development',music:'Music production',poetry:'Poetry',
 'persuasive-writing':'Persuasive writing',research:'Research & sources',
 legislation:'Bills & legislative packages',image:'Images & editing',
 video:'Film & video',voice:'Voice & audio',data:'Data analysis',workflow:'AI workflows'
});
const ALIASES=Object.freeze({
 code:['ide','programming','application','website','development','debugging'],
 music:['song','stems','tracks','audio','producer','beats'],
 poetry:['verse','poem','rhyme'], 'persuasive-writing':['argument','speech','advocacy','essay','marketing'],
 research:['facts','citations','documents','sources'],legislation:['statute','legal','bill','policy','law'],
 image:['picture','photo','art','draw','design'],video:['film','trailer','movie','storyboard'],
 voice:['speech','transcription','dub','narration'],data:['sql','spreadsheet','chart','analysis'],
 workflow:['automation','agents','tasks','batch','orchestration']
});
export const COMMANDS=Object.freeze(WORKSPACE_DOMAINS.map((domain,i)=>Object.freeze({
 id:domain,label:LABELS[domain]||domain,keywords:ALIASES[domain]||[],order:i
})));
export function findCommands(input='',favorites=[],commands=COMMANDS){
 const needle=String(input||'').toLowerCase().trim();
 const marked=new Set(favorites);
 return commands.filter(c=>[c.label,c.id,...c.keywords].join(' ').toLowerCase().includes(needle))
 .sort((a,b)=>Number(marked.has(b.id))-Number(marked.has(a.id))||a.order-b.order);
}
const STORAGE_KEY='superintelligence.command.favorites.v1';
function readFavorites(){
 try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  if(Array.isArray(parsed))return parsed.filter(id=>COMMANDS.some(c=>c.id===id)).slice(0,11);
 }catch{}
 return [];
}
export default function CommandPalette({active,onChoose,defaultOpen=false}){
 const [open,setOpen]=useState(defaultOpen),[search,setSearch]=useState(''),[favorites,setFavorites]=useState([]);
 const [index,setIndex]=useState(0),inputRef=useRef(null),launchRef=useRef(null);
 useEffect(()=>{setFavorites(readFavorites())},[]);
 useEffect(()=>{
  function onKey(event){
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
    event.preventDefault();setOpen(v=>!v);return;
   }
   if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);}
  }
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[open]);
 useEffect(()=>{
  if(open){setSearch('');setIndex(0);inputRef.current?.focus();}
  else launchRef.current?.focus();
 },[open]);
 const results=findCommands(search,favorites);
 function choose(command){if(!COMMANDS.some(c=>c.id===command.id))return;onChoose(command.id);setOpen(false);}
 function toggleFavorite(id){
  const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
  setFavorites(next);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{}
 }
 function navigate(event){
  if(event.key==='ArrowDown'){event.preventDefault();setIndex(i=>Math.min(results.length-1,i+1));}
  if(event.key==='ArrowUp'){event.preventDefault();setIndex(i=>Math.max(0,i-1));}
  if(event.key==='Enter'&&results[index]){event.preventDefault();choose(results[index]);}
  if(event.key==='Tab'){
   const root=event.currentTarget.closest('[role=dialog]');
   const focusables=[...root.querySelectorAll('button:not([disabled]),input:not([disabled])')];
   const first=focusables[0],last=focusables.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 }
 return React.createElement(React.Fragment,null,
   React.createElement('button',{ref:launchRef,type:'button',className:'launcher-trigger',onClick:()=>setOpen(true),'aria-haspopup':'dialog','aria-expanded':open,'aria-keyshortcuts':'Control+K Meta+K'},
     'Find AI tools',React.createElement('kbd',null,'⌘ K')),
   open&&React.createElement('div',{className:'launcher-scrim',onMouseDown:e=>{if(e.target===e.currentTarget)setOpen(false)}},
     React.createElement('section',{role:'dialog','aria-modal':'true','aria-labelledby':'launcher-heading',className:'launcher-dialog'},
       React.createElement('div',{className:'launcher-head'},
         React.createElement('h2',{id:'launcher-heading'},'Find AI tools'),
         React.createElement('button',{type:'button',onClick:()=>setOpen(false),'aria-label':'Close command launcher'},'×')),
       React.createElement('label',{htmlFor:'launcher-search'},'Search by task, tool or domain'),
       React.createElement('input',{ref:inputRef,id:'launcher-search',type:'search',value:search,autoComplete:'off',
         placeholder:'Code, law, film, song, research…',onChange:e=>{setSearch(e.target.value);setIndex(0)},onKeyDown:navigate}),
       React.createElement('p',{className:'launcher-subtitle'},'Opening a workspace does not start generation or charge credits. AI providers are not currently verified.'),
       React.createElement('ul',{className:'launcher-results',role:'listbox','aria-label':'Matching AI workspaces'},
         ...results.map((c,i)=>React.createElement('li',{key:c.id,className:i===index?'launcher-selected':''},
           React.createElement('button',{type:'button','aria-current':c.id===active?'true':undefined,
             onClick:()=>choose(c),onMouseEnter:()=>setIndex(i),className:'launcher-item'},
             React.createElement('strong',null,c.label),
             React.createElement('span',null,'Workspace editor · AI generation unverified')),
           React.createElement('button',{type:'button',className:'launcher-star','aria-label':favorites.includes(c.id)?'Remove '+c.label+' from favorites':'Add '+c.label+' to favorites','aria-pressed':favorites.includes(c.id),onClick:()=>toggleFavorite(c.id)},favorites.includes(c.id)?'★':'☆')
         ))),
       !results.length&&React.createElement('p',{role:'status'},'No matching workspaces. Try a different goal.'),
       React.createElement('p',{className:'launcher-foot'},'Enter to open · ↑ ↓ to navigate · Esc to close')
     )
   )
 );
}