import {createClient} from '@supabase/supabase-js';
export const supabase=createClient('https://ejctwgtqekavtggagecg.supabase.co','sb_publishable_X3HZ33oNHgovxBNqx-xWig_2fcDsyjW',{auth:{storageKey:'atlas-personal-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
export async function pagesApi(path:string,body?:any){
 if(path==='auth'&&body.action==='logout'){const {error}=await supabase.auth.signOut();if(error)throw error;window.location.assign(import.meta.env.BASE_URL);return {ok:true};}
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Please sign in again.');
 const {data,error}=await supabase.functions.invoke('atlas-pages-api',{body:{route:path,...(body?{payload:body}:{})}});
 if(error)throw Error('Request failed. Check your connection or sign in again.');if(data?.error)throw Error(data.error);return data;
}
