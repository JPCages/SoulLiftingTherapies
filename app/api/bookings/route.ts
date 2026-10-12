import {createBookingRequest} from '@/lib/db';
import {currentCustomerId} from '@/lib/customer-auth';
import {clientIp,createRateLimiter} from '@/lib/rate-limit';

// Per-IP throttle on successful sends: 8 per hour. See lib/rate-limit.ts.
const bookingLimiter=createRateLimiter({limit:8,windowMs:60*60*1000});
const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';

export async function POST(request:Request){
  if(!process.env.DATABASE_URL)return Response.json({error:'Requests are not available yet. Please call or message Emma.'},{status:503});
  const ip=clientIp(request);

  let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>}catch{return Response.json({error:'Invalid request'},{status:400})}
  if(clean(body.website,80))return Response.json({ok:true});   // honeypot: silently accept, store nothing

  const name=clean(body.name,80), phone=clean(body.phone,32), email=clean(body.email,120).toLowerCase();
  const treatment=clean(body.treatment,120), location=clean(body.location,80);
  const preferences=clean(body.preferences,600), notes=clean(body.notes,600);

  if(!name)return Response.json({error:'Please add your name.'},{status:400});
  if(!phone)return Response.json({error:'Please add a phone number so Emma can confirm.'},{status:400});
  if(phone.replace(/\D/g,'').length<10)return Response.json({error:'That phone number looks too short.'},{status:400});
  if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return Response.json({error:'That email address does not look right.'},{status:400});
  if(!treatment)return Response.json({error:'Please choose a treatment.'},{status:400});
  if(!location)return Response.json({error:'Please choose where you would like to be seen.'},{status:400});
  if(!preferences)return Response.json({error:'Please tell Emma which days or times suit you.'},{status:400});

  // Only successful sends count towards the limit, so a mistyped number costs nothing.
  if(bookingLimiter.isLimited(ip))return Response.json({error:'That is several requests already. Please call or text Emma instead.'},{status:429});

  const customerId=await currentCustomerId().catch(()=>null);
  await createBookingRequest({name,email:email||null,phone,treatment,location,preferences,notes:notes||null,customerId});
  bookingLimiter.record(ip);
  return Response.json({ok:true});
}
