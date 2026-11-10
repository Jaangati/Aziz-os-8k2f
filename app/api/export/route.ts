import {gateway,identity,failure} from '../../../lib/backend';
export async function GET(request:Request){try{const user=await identity(request);return Response.json(await gateway(user.userId,'export'));}catch(error){return failure(error);}}
