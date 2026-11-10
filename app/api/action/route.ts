import {z} from 'zod';
import {gateway,identity,jsonBody,failure,ApiError} from '../../../lib/backend';
import {validateSave,settingsSchema} from '../../../lib/contracts';
export async function POST(request:Request){try{
 const user=await identity(request,true);const body=await jsonBody(request);
 let payload:unknown={};
 if(body.action==='save'){payload=validateSave(body.payload);if((payload as any).kind==='document')throw new ApiError(400,'Use the document upload flow.');}
 else if(body.action==='delete'){payload=z.object({id:z.string().uuid(),version:z.number().int().positive()}).parse(body.payload);const state=await gateway(user.userId,'state');if(state.entries.some((e:any)=>e.id===(payload as any).id&&e.kind==='document'))throw new ApiError(400,'Use the document delete action.');}
 else if(body.action==='settings')payload=settingsSchema.parse(body.payload);
 else if(body.action!=='read')throw new ApiError(400,'Unsupported action.');
 return Response.json(await gateway(user.userId,body.action,payload));
}catch(error){return failure(error);}}
