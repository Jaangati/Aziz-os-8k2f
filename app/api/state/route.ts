import {gateway,identity,failure} from '../../../lib/backend';
import {getRuntime} from '../../../lib/runtime';
export async function GET(request:Request){try{
 const user=await identity(request); const data=await gateway(user.userId,'state');
 return Response.json({...data,capabilities:{ai:!!getRuntime().OPENAI_API_KEY,external_notifications:false,vault:true},user:{name:user.displayName,email:user.email}});
}catch(error){return failure(error);}}
