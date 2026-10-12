"use client";
import React,{useEffect,useState} from 'react';
const OPERATION_HINTS={
 code:['code.','coding.','text.'],music:['music.','audio.'],poetry:['text.','writing.'],
 'persuasive-writing':['text.','writing.'],research:['research.','text.','search.'],
 legislation:['legislation.','text.','writing.'],image:['image.','vision.'],video:['video.'],
 voice:['speech.','voice.','audio.'],data:['data.','analysis.','code.','text.'],
 workflow:['agent.','workflow.','text.']
};
export function isCompatible(model,domain){
 if(!model||!Array.isArray(model.operations))return false;
 return model.operations.some(op=>typeof op==='string'&&(OPERATION_HINTS[domain]||[]).some(prefix=>op.startsWith(prefix)));
}
export function availableModels(items=[],domain='research'){
 return items.filter(x=>x.available===true&&isCompatible(x,domain));
}
function loadPreference(domain){
 try{const text=localStorage.getItem('command.model-settings.v1.'+domain);if(text){const value=JSON.parse(text);if(typeof value==='object'&&value)return value}}catch{}
 return null;
}
export default function ModelControls({domain}){
 const [usage,setUsage]=useState('personal'),[models,setModels]=useState([]),[status,setStatus]=useState('checking');
 const [quality,setQuality]=useState('balanced'),[selected,setSelected]=useState(null),[comparison,setComparison]=useState([]);
 const eligible=availableModels(models,domain);
 useEffect(()=>{const prior=loadPreference(domain);setQuality(['speed','balanced','quality'].includes(prior?.quality)?prior.quality:'balanced');setSelected(prior?.modelId||null);setComparison([])},[domain]);
 useEffect(()=>{let live=true;const abort=new AbortController();
  setStatus('checking');setModels([]);
  fetch('/api/models?usage='+encodeURIComponent(usage),{cache:'no-store',signal:abort.signal})
   .then(async r=>{const result=await r.json();if(live){setModels(Array.isArray(result.items)?result.items:[]);setStatus(r.ok?'connected':result.status||'unavailable')}})
   .catch(()=>{if(live)setStatus('unavailable')});
  return()=>{live=false;abort.abort()};
 },[usage]);
 useEffect(()=>{if(selected&&!eligible.some(m=>m.id===selected))setSelected(null)},[selected,domain,usage,models]);
 function save(modelId=selected,nextQuality=quality){
  try{localStorage.setItem('command.model-settings.v1.'+domain,JSON.stringify({modelId,quality:nextQuality,usage}))}catch{}
 }
 function toggleCompare(id){setComparison(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous.slice(-1),id])}
 const compared=comparison.map(id=>eligible.find(x=>x.id===id)).filter(Boolean);
 return React.createElement('section',{className:'model-controls','aria-label':'Model selection and comparison'},
  React.createElement('div',{className:'model-controls-heading'},React.createElement('h2',null,'Model controls'),
    React.createElement('span',{role:'status','aria-live':'polite'},'Catalog: '+status)),
  React.createElement('div',{className:'model-controls-options'},
    React.createElement('label',null,'Intended use ',React.createElement('select',{value:usage,onChange:e=>{setUsage(e.target.value);setSelected(null)}},
      React.createElement('option',{value:'personal'},'Personal'),React.createElement('option',{value:'commercial'},'Commercial'))),
    React.createElement('label',null,'Quality preference ',React.createElement('select',{value:quality,onChange:e=>{setQuality(e.target.value);save(selected,e.target.value)}},
      React.createElement('option',{value:'speed'},'Speed'),React.createElement('option',{value:'balanced'},'Balanced'),React.createElement('option',{value:'quality'},'Quality')))),
  React.createElement('p',{className:'model-controls-note'},'Preferences are stored in this browser only. They are not applied to AI requests until authorized provider routing is connected. The catalog does not provide a numeric price quote.'),
  !eligible.length?
   React.createElement('p',{className:'model-controls-empty',role:'status'},'No verified compatible models are available for this workspace and usage category.'):
   React.createElement('ul',{className:'model-list'},...eligible.map(m=>React.createElement('li',{key:m.id},
     React.createElement('div',null,React.createElement('strong',null,m.provider+' · '+m.model),
       React.createElement('span',null,m.operations.join(', ')),
       React.createElement('small',null,'Rights: '+m.licenseScope+' · Health: '+m.healthStatus+' · Price: '+(m.priceStatus==='known'?'status verified (amount not provided)':'unverified'))),
     React.createElement('button',{type:'button',onClick:()=>{setSelected(m.id);save(m.id,quality)},'aria-pressed':selected===m.id},selected===m.id?'Preferred':'Prefer'),
     React.createElement('button',{type:'button','aria-pressed':comparison.includes(m.id),onClick:()=>toggleCompare(m.id)},comparison.includes(m.id)?'Remove comparison':'Compare')
   ))),
  compared.length>0&&React.createElement('table',{className:'model-comparison'},
    React.createElement('caption',null,'Verified catalog comparison'),
    React.createElement('thead',null,React.createElement('tr',null,React.createElement('th',null,'Dimension'),...compared.map(m=>React.createElement('th',{key:m.id},m.provider+' / '+m.model)))),
    React.createElement('tbody',null,...['revision','licenseScope','priceStatus','healthStatus'].map(key=>React.createElement('tr',{key},
      React.createElement('th',null,key),...compared.map(m=>React.createElement('td',{key:m.id},m[key]))))))
 );
}
