/** Browser-profile only: storage is a UI preference, never authentication or project data. */
export const DEFAULT_NAV_WIDTH=205;
export const MIN_NAV_WIDTH=160;
export const MAX_NAV_WIDTH=400;
export function layoutStorageKey(domain){
 if(typeof domain!=='string'||!/^[a-z-]{1,40}$/.test(domain))
   throw new TypeError('Valid workspace domain required');
 return 'scc.workspace.layout.v1.'+domain;
}
export function clampNavWidth(value){
 return Number.isFinite(value)?Math.min(MAX_NAV_WIDTH,Math.max(MIN_NAV_WIDTH,Math.round(value))):DEFAULT_NAV_WIDTH;
}
export function readNavWidth(storage,domain){
 try{
   const value=JSON.parse(storage.getItem(layoutStorageKey(domain))??'null');
   return typeof value==='number'&&Number.isFinite(value)?clampNavWidth(value):DEFAULT_NAV_WIDTH;
 }catch{return DEFAULT_NAV_WIDTH;}
}
export function saveNavWidth(storage,domain,width){
 const next=clampNavWidth(width);
 try{storage.setItem(layoutStorageKey(domain),JSON.stringify(next));}catch{ /* storage denied: keep session preference */ }
 return next;
}
export function keyboardNavWidth(width,key,shiftKey=false){
 const step=shiftKey?40:10;
 if(key==='Home')return MIN_NAV_WIDTH;
 if(key==='End')return MAX_NAV_WIDTH;
 if(key==='ArrowLeft')return clampNavWidth(width-step);
 if(key==='ArrowRight')return clampNavWidth(width+step);
 return null;
}
