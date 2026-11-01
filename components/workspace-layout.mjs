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

/** Local private display preference scoped to a tenant and one domain. */
export function inspectorStorageKey(tenant,domain){
 if(typeof tenant!=='string'||tenant.length<1||tenant.length>128)
   throw new TypeError('Valid tenant required');
 return 'scc.workspace.inspectors.v1.'+encodeURIComponent(tenant)+'.'+layoutStorageKey(domain);
}
export function clampInspectorPercent(value){
 return Number.isFinite(value)?Math.min(70,Math.max(30,Math.round(value))):50;
}
export function keyboardInspectorPercent(width,key,shiftKey=false){
 const step=shiftKey?10:5;
 if(key==='Home')return 30;
 if(key==='End')return 70;
 if(key==='ArrowLeft')return clampInspectorPercent(width-step);
 if(key==='ArrowRight')return clampInspectorPercent(width+step);
 return null;
}
export function readInspectorPercent(storage,tenant,domain){
 try{
   const value=JSON.parse(storage.getItem(inspectorStorageKey(tenant,domain))??'null');
   return typeof value==='number'&&Number.isFinite(value)?clampInspectorPercent(value):50;
 }catch{return 50;}
}
export function saveInspectorPercent(storage,tenant,domain,width){
 const next=clampInspectorPercent(width);
 try{storage.setItem(inspectorStorageKey(tenant,domain),JSON.stringify(next));}catch{}
 return next;
}

/** Browser storage can be inaccessible even when window exists (privacy mode,
 * disabled cookies or sandboxed frames). UI must still be navigable. */
export function optionalBrowserStorage(browser){
 try{return browser?.localStorage??null;}catch{return null;}
}

export function navWidthFromPointer(clientX,left){
 if(!Number.isFinite(clientX)||!Number.isFinite(left))return DEFAULT_NAV_WIDTH;
 return clampNavWidth(clientX-left);
}
export function inspectorPercentFromPointer(clientX,left,totalWidth){
 if(!Number.isFinite(clientX)||!Number.isFinite(left)||
   !Number.isFinite(totalWidth)||totalWidth<=0)return 50;
 return clampInspectorPercent((clientX-left)*100/totalWidth);
}
