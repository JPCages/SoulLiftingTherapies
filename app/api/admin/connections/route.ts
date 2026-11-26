import {isAdmin} from '@/lib/auth';
import {listConnections,connectWithKey,syncOne,syncAll,removeConnection} from '@/lib/connectors/service';
import {providerById} from '@/lib/connectors/registry';

// Emma's Connections: list (never any secrets), connect with a key, update, disconnect.
const deny=()=>Response.json({error:'Admin sign-in required'},{status:401});
const fail=(e:unknown,status=400)=>Response.json({error:e instanceof Error?e.message:'That did not work'},{status});

export async function GET(){
  if(!(await isAdmin()))return deny();
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  return Response.json(await listConnections());
}

export async function POST(request:Request){
  if(!(await isAdmin()))return deny();
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const b=await request.json().catch(()=>({})) as {action?:string;provider?:string;key?:string};
  const id=String(b.provider??'');
  if(b.action==='syncAll')return Response.json({results:await syncAll()});
  if(!providerById(id))return Response.json({error:'Unknown system'},{status:400});
  try{
    switch(b.action){
      case 'key':{const meta=await connectWithKey(id,String(b.key??''));const first=await syncOne(id);return Response.json({ok:true,account:meta.account,first})}
      case 'sync':{const r=await syncOne(id);return r.error?Response.json({error:r.error},{status:502}):Response.json(r)}
      case 'disconnect':{await removeConnection(id);return Response.json({ok:true})}
    }
  }catch(e){return fail(e)}
  return Response.json({error:'Unknown action'},{status:400});
}
