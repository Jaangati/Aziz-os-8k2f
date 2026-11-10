import {z} from 'zod';
import {authRequest,OWNER_EMAIL,SESSION_COOKIE} from '../../../lib/atlas-auth';
import {jsonBody,failure,ApiError} from '../../../lib/backend';
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError(403,'Request origin was not accepted.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'JSON required.');
 const body=await jsonBody(request);
 const cookie=(token:string,age:number)=>`${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
 if(body.action==='logout')return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',0)}});
 const input=z.object({action:z.enum(['login','register']),email:z.string().email(),password:z.string().min(12).max(128)}).parse(body);
 if(input.email.toLowerCase()!==OWNER_EMAIL)throw new ApiError(403,'This is an owner-only workspace.');
 const response=await authRequest(input.action==='register'?'signup':'token?grant_type=password',{email:input.email,password:input.password});
 const data=await response.json() as any;
 if(!response.ok)throw new ApiError(response.status===429?429:400,response.status===429?'Too many attempts. Please wait before trying again.':'Sign-in failed. Check your details and confirm your email before signing in.');
 if(input.action==='register')return Response.json({message:'Check your email to confirm your account. After confirming, return here and sign in.'});
 if(!data.access_token||!data.user?.email_confirmed_at||data.user.email.toLowerCase()!==OWNER_EMAIL)throw new ApiError(403,'Confirm your email before signing in.');
 return Response.json({ok:true},{headers:{'Set-Cookie':cookie(data.access_token,Math.min(data.expires_in||3600,3600))}});
}catch(error){return failure(error);}}
