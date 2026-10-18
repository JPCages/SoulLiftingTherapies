import {isAdmin} from '@/lib/auth';
import {getSetting,setSetting} from '@/lib/db';
import {emailConfigured} from '@/lib/email';
import {ALERT_EMAIL_KEY,alertAddress,sendTestAlert} from '@/lib/booking-alerts';

const valid=(e:string)=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

// GET: where alerts go and whether email is switched on.
export async function GET(){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  return Response.json({
    email:(await getSetting(ALERT_EMAIL_KEY))??'',
    effective:await alertAddress(),
    configured:emailConfigured(),
  });
}

// PUT {email}: save the alert address (blank = use the business email).
export async function PUT(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const {email}=await request.json().catch(()=>({})) as {email?:string};
  const e=(email??'').trim().toLowerCase();
  if(e&&!valid(e))return Response.json({error:'That email address does not look right.'},{status:400});
  await setSetting(ALERT_EMAIL_KEY,e||null);
  return Response.json({ok:true,effective:await alertAddress()});
}

// POST: send a test alert to the saved address.
export async function POST(){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!emailConfigured())return Response.json({error:'Email is not switched on yet. JP needs to add the email key in Railway.'},{status:503});
  const to=await alertAddress();
  if(!to)return Response.json({error:'Add an email address first.'},{status:400});
  const r=await sendTestAlert(to);
  if(!r.ok)return Response.json({error:`The test could not be sent (${r.detail??r.reason}).`},{status:502});
  return Response.json({ok:true,to});
}
