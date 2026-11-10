import {cookies} from 'next/headers';
import {getRuntime} from './runtime';
export const OWNER_EMAIL='krimiaziz@gmail.com';
export const SESSION_COOKIE='__Host-atlas-session';
export async function authRequest(path:string,body?:unknown,token?:string){
 const env=getRuntime();
 if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)throw new Error('Authentication unavailable');
 return fetch(env.SUPABASE_URL+'/auth/v1/'+path,{method:body===undefined?'GET':'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
}
export async function atlasUser(){
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!token)return null;
 const response=await authRequest('user',undefined,token);
 if(!response.ok)return null;
 const user=await response.json() as any;
 if(!user.id||!user.email_confirmed_at||user.email?.toLowerCase()!==OWNER_EMAIL)return null;
 return {userId:'supabase:'+user.id,displayName:'Aziz',email:user.email};
}
