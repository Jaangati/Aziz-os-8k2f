import {identity,jsonBody,failure,ApiError} from '../../../lib/backend';
import {getRuntime} from '../../../lib/runtime';
export async function POST(request:Request){try{
 const user=await identity(request,true);const input=await jsonBody(request);const env=getRuntime();
 if(!['upload','confirm','download','delete'].includes(input.action))throw new ApiError(400,'Unsupported action');
 const response=await fetch(`${env.SUPABASE_URL}/functions/v1/atlas-vault`,{method:'POST',headers:{'Content-Type':'application/json','X-Atlas-Key':env.ATLAS_BRIDGE_KEY||''},body:JSON.stringify({...input,subject:user.userId}),signal:AbortSignal.timeout(25000)});
 const data=await response.json() as any;if(!response.ok)throw new ApiError(400,data.error||'Document request failed');
 return Response.json(data);
}catch(error){return failure(error);}}
