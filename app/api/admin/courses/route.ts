import {isAdmin} from '@/lib/auth';
import {listCourses,createCourse,markCourseSession,deleteCourse} from '@/lib/db';

const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';

export async function GET(){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  return Response.json({courses:await listCourses()});
}

export async function POST(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const b=await request.json().catch(()=>({})) as Record<string,unknown>;
  const id=Number(b.id);
  if(b.action==='create'){
    const person_name=clean(b.name,80), title=clean(b.title,120), total=Number(b.sessions);
    if(!person_name||!title)return Response.json({error:'Add who it is for and what the course is.'},{status:400});
    if(!Number.isInteger(total)||total<1||total>100)return Response.json({error:'Sessions must be between 1 and 100.'},{status:400});
    const cid=Number(b.customerId);
    const exp=clean(b.expires,10);
    const course=await createCourse({customer_id:Number.isInteger(cid)&&cid>0?cid:null,person_name,title,sessions_total:total,note:clean(b.note,200)||null,expires_on:/^\d{4}-\d{2}-\d{2}$/.test(exp)?exp:null});
    return Response.json({ok:true,course});
  }
  if(!Number.isInteger(id)||id<1)return Response.json({error:'Unknown course'},{status:400});
  if(b.action==='use'||b.action==='undo'){
    const c=await markCourseSession(id,b.action==='undo');
    return c?Response.json({ok:true,course:c}):Response.json({error:b.action==='use'?'All sessions are used.':'Nothing to put back.'},{status:409});
  }
  if(b.action==='delete'){await deleteCourse(id);return Response.json({ok:true})}
  return Response.json({error:'Unknown action'},{status:400});
}
