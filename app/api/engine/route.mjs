import {EngineClient} from '../../../vendor/engine/packages/sdk/src/index.mjs';
export async function GET(){
 const baseUrl=process.env.ENGINE_API_URL;
 if(!baseUrl)return Response.json({status:'unconfigured',providerGeneration:false},{status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const client=new EngineClient({baseUrl,fetchImpl:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(3000),cache:'no-store'})});
  const health=await client.health();
  return Response.json({status:health.status==='ok'?'connected':'unavailable',engineVersion:health.version,providerGeneration:false},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({status:'unavailable',providerGeneration:false},{status:503,headers:{'Cache-Control':'no-store'}});}
}
