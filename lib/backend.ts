import { atlasUser } from './atlas-auth';
import { getRuntime } from './runtime';
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
export async function identity(request:Request,write=false){
 const user=await atlasUser();
 if(!user)throw new ApiError(401,'Sign in to your private workspace.');
 if(write){
  const origin=request.headers.get('origin');
  if(origin!==new URL(request.url).origin)throw new ApiError(403,'Request origin was not accepted.');
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'JSON required.');
 }
 return user;
}
export async function jsonBody(request:Request){
 if(Number(request.headers.get('content-length'))>32768)throw new ApiError(413,'Request is too large.');
 const raw=await request.text();
 if(raw.length>32768)throw new ApiError(413,'Request is too large.');
 try{return JSON.parse(raw);}catch{throw new ApiError(400,'Invalid JSON.');}
}
export async function gateway(subject:string,action:string,payload:unknown={}){
 const env=getRuntime();
 if(!env.ATLAS_BRIDGE_KEY||!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)throw new ApiError(503,'Private database connection is not configured.');
 const rpc=action==='export'?'atlas_export':action==='start_run'?'atlas_start_run':'atlas_gateway';
 const args={p_key:env.ATLAS_BRIDGE_KEY,p_subject:subject,...(action==='export'?{}:action==='start_run'?{p_payload:payload}:{p_action:action,p_payload:payload})};
 const response=await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${rpc}`,{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(20000)});
 const result=await response.json() as any;
 if(!response.ok){
  if(result.code==='40001')throw new ApiError(409,'This record changed on another device. Refresh and try again.');
  if(result.message?.startsWith('Daily limit')||result.message?.startsWith('An assistant request'))throw new ApiError(429,result.message);
  throw new ApiError(response.status===401||response.status===403?503:400,'The database could not complete this request. Refresh and try again.');
 }
 return result;
}
export function failure(error:unknown){
 if(error instanceof ApiError)return Response.json({error:error.message},{status:error.status});
 if(error instanceof Error && (error.name==='ZodError'||error.message==='A version is required when editing.'))return Response.json({error:'Please check the form fields.'},{status:400});
 console.error('Atlas unexpected request failure',error instanceof Error?error.name+': '+error.message:'Unknown error');
 return Response.json({error:'The request could not finish. Please try again.'},{status:500});
}
