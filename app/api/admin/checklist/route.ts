import {isAdmin} from '@/lib/auth';
import {getSetting,setSetting,readSiteContent} from '@/lib/db';
import {CHECKLIST_KEY,cleanAnswers,parseAnswers,checklistStatus} from '@/lib/checklist';

// Emma's launch to-do list. Admin only: the answers include business and
// data-protection details that do not belong in the public content API.
export async function GET(){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  const answers=parseAnswers(await getSetting(CHECKLIST_KEY));
  const content=await readSiteContent();
  return Response.json({answers,items:checklistStatus(content,answers)});
}

export async function PUT(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const body=await request.json().catch(()=>null);
  const answers={...cleanAnswers(body),updatedAt:new Date().toISOString()};
  await setSetting(CHECKLIST_KEY,JSON.stringify(answers));
  const content=await readSiteContent();
  return Response.json({ok:true,answers,items:checklistStatus(content,answers)});
}
