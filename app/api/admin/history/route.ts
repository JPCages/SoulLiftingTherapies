import {isAdmin} from '@/lib/auth';
import {listContentHistory,restoreContentVersion} from '@/lib/db';

// Emma's recent publishes, newest first, each one undoable.
export async function GET(){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({versions:[]});
  return Response.json({versions:await listContentHistory()});
}

// Undo: put back the version from before change `id`.
export async function POST(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const body=await request.json().catch(()=>null) as {id?:unknown}|null;
  const id=Number(body?.id);
  if(!Number.isInteger(id)||id<1)return Response.json({error:'Choose a version to go back to'},{status:400});
  if(!(await restoreContentVersion(id)))return Response.json({error:'That version is no longer kept'},{status:404});
  return Response.json({ok:true});
}
