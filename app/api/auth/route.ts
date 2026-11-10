import {z} from 'zod';
import {cookies} from 'next/headers';
import {authRequest,OWNER_EMAIL,SESSION_COOKIE} from '../../../lib/atlas-auth';
import {jsonBody,failure,ApiError} from '../../../lib/backend';
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError(403,'Request origin was not accepted.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'JSON required.');
 const body=await jsonBody(request);
 const cookie=(token:string,age:number)=>`${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
 if(body.action==='logout'){
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(token){const r=await authRequest('logout',{},token);if(!r.ok&&r.status!==401)throw new ApiError(503,'Sign-out could not be confirmed. Please retry.');}
 return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',0)}});
 }
 if(body.action==='resend'){
 const email=z.string().email().parse(body.email).toLowerCase();
 if(email!==OWNER_EMAIL)throw new ApiError(403,'This is an owner-only workspace.');
 const r=await authRequest('resend?redirect_to='+encodeURIComponent(new URL('/login',request.url).href),{type:'signup',email});
 if(!r.ok)throw new ApiError(r.status===429?429:400,'Could not resend. Wait a minute and try again.');
 return Response.json({message:'A fresh confirmation email was requested. Use only the newest link, then return here to sign in.'});
 }
 const input=z.object({action:z.enum(['login','register']),email:z.string().email(),password:z.string().min(12).max(128)}).parse(body);
 if(input.email.toLowerCase()!==OWNER_EMAIL)throw new ApiError(403,'This is an owner-only workspace.');
 const response=await authRequest(input.action==='register'?'signup?redirect_to='+encodeURIComponent(new URL('/login',request.url).href):'token?grant_type=password',{email:input.email,password:input.password});
 const data=await response.json() as any;
 if(!response.ok)throw new ApiError(response.status===429?429:400,response.status===429?'Too many attempts. Please wait before trying again.':'Sign-in failed. Check your details and confirm your email before signing in.');
 if(input.action==='register')return Response.json({message:'Check your email to confirm your account. After confirming, return here and sign in.'});
 if(!data.access_token||!data.user?.email_confirmed_at||data.user.email.toLowerCase()!==OWNER_EMAIL)throw new ApiError(403,'Confirm your email before signing in.');
 return Response.json({ok:true},{headers:{'Set-Cookie':cookie(data.access_token,Math.min(data.expires_in||3600,3600))}});
}catch(error){return failure(error);}}
