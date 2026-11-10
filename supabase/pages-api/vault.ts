import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const url=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const mimeTypes=['application/pdf','image/jpeg','image/png','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
Deno.serve(async(req:Request)=>{
 try{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const raw=await req.text();if(raw.length>24000)return new Response('Too large',{status:413});
  const input=JSON.parse(raw);
  const key='';
  const userDb=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await userDb.auth.getUser();
  if(authError||!user||!user.email_confirmed_at||user.email?.toLowerCase()!=='krimi.aziz@gmail.com')return new Response('Unauthorized',{status:401});
  input.subject='supabase:'+user.id;
  if(typeof input.subject!=='string'||typeof input.action!=='string')return new Response('Bad request',{status:400});
  const rpc=async(action:string,payload:unknown={})=>{
   const {data,error}=await userDb.rpc('atlas_gateway',{p_key:key,p_subject:input.subject,p_action:action,p_payload:payload});
   if(error)throw new Error('Access or database request failed');return data;
  };
  const auth=await rpc('authorize');
  const bucket=db.storage.from('atlas-vault');
  let result:unknown;
  if(input.action==='upload'){
   if(!mimeTypes.includes(input.mime)||!Number.isInteger(input.size)||input.size<1||input.size>10485760)throw new Error('Unsupported file. Use PDF, JPG, PNG, TXT or DOCX up to 10 MB.');
   const path=auth.prefix+'/'+crypto.randomUUID();
   const {data,error}=await bucket.createSignedUploadUrl(path);if(error)throw new Error('Upload could not be prepared');
   result={path,signedUrl:data.signedUrl};
  }else if(input.action==='confirm'){
   if(typeof input.path!=='string'||!input.path.startsWith(auth.prefix+'/')||input.path.split('/').length!==2)throw new Error('Invalid file path');
   if(typeof input.title!=='string'||input.title.length<1||input.title.length>300)throw new Error('Invalid filename');
   const filename=input.path.split('/')[1];
   const {data,error}=await bucket.list(auth.prefix,{search:filename,limit:10});
   const object=data?.find(x=>x.name===filename);
   if(error||!object)throw new Error('File upload is incomplete. Retry the upload.');
   const size=Number(object.metadata?.size);const mime=object.metadata?.mimetype;
   if(!mimeTypes.includes(mime)||!size||size>10485760)throw new Error('Unsupported stored file');
   const state=await rpc('state');
   const existing=state.entries.find((e:any)=>e.kind==='document'&&e.data.path===input.path);
   result=existing?{id:existing.id}:await rpc('save',{kind:'document',data:{title:input.title,path:input.path,size,mime,body:''}});
  }else if(input.action==='download'||input.action==='delete'){
   const state=await rpc('state');const entry=state.entries.find((e:any)=>e.id===input.id&&e.kind==='document');
   if(!entry)throw new Error('Document not found');
   if(input.action==='download'){
    const {data,error}=await bucket.createSignedUrl(entry.data.path,60,{download:entry.data.title});if(error)throw new Error('Download unavailable');result={url:data.signedUrl};
   }else{
    if(input.version!==entry.version)throw new Error('Document changed. Refresh before deleting.');
    const {error}=await bucket.remove([entry.data.path]);if(error)throw new Error('File could not be deleted');
    result=await rpc('delete',{id:entry.id,version:entry.version});
   }
  }else throw new Error('Unknown action');
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Request failed'},{status:400});}
});
