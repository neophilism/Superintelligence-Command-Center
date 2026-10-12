const allowedUsage=new Set(['personal','commercial']);
export function sanitizeCatalog(data){
 if(!data||!Array.isArray(data.items))throw new TypeError('Invalid engine catalog response');
 return data.items.slice(0,200).filter(item=>item&&typeof item.id==='string'&&typeof item.provider==='string'&&typeof item.model==='string'&&Array.isArray(item.operations)).map(item=>({
  id:item.id,provider:item.provider,model:item.model,revision:String(item.revision||''),
  operations:item.operations.filter(x=>typeof x==='string').slice(0,30),
  modalities:Array.isArray(item.modalities)?item.modalities.filter(x=>typeof x==='string').slice(0,15):[],
  regions:Array.isArray(item.regions)?item.regions.filter(x=>typeof x==='string').slice(0,30):[],
  licenseScope:['none','personal','commercial'].includes(item.licenseScope)?item.licenseScope:'none',
  priceStatus:item.priceStatus==='known'?'known':'unknown',
  healthStatus:['healthy','degraded','outage','unknown'].includes(item.healthStatus)?item.healthStatus:'unknown',
  available:item.available===true,reasons:Array.isArray(item.reasons)?item.reasons.filter(x=>typeof x==='string').slice(0,20):[]
 }));
}
export async function GET(request,{baseUrl=process.env.ENGINE_API_URL,fetchImpl=fetch}={}){
 const params=new URL(request.url).searchParams;
 const usage=params.get('usage')||'personal';
 if(!allowedUsage.has(usage))return Response.json({status:'invalid_filter',items:[]},{status:400,headers:{'Cache-Control':'no-store'}});
 if(!baseUrl)return Response.json({status:'unconfigured',items:[]},{status:503,headers:{'Cache-Control':'no-store'}});
 let endpoint;
 try{
  const base=new URL(baseUrl);
  if(base.protocol!=='https:'&&!(base.hostname==='localhost'||base.hostname==='127.0.0.1'))throw new TypeError('Unsafe catalog origin');
  endpoint=new URL('/v1/models',base);
  endpoint.searchParams.set('usage',usage);
 }catch{return Response.json({status:'invalid_configuration',items:[]},{status:503,headers:{'Cache-Control':'no-store'}})}
 try{
  const reply=await fetchImpl(endpoint,{method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(4000)});
  if(!reply.ok)throw new Error('Catalog upstream '+reply.status);
  const items=sanitizeCatalog(await reply.json());
  return Response.json({status:'connected',items},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({status:'unavailable',items:[]},{status:503,headers:{'Cache-Control':'no-store'}})}
}
