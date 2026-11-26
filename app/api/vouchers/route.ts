import {readSiteContent,createVoucherOrder} from '@/lib/db';
import {clientIp,createRateLimiter} from '@/lib/rate-limit';
import {safePayLink} from '@/lib/vouchers';
import {notifyVoucherOrder} from '@/lib/voucher-email';

const limiter=createRateLimiter({limit:6,windowMs:60*60*1000});
const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';

// A customer starts buying a voucher: the order is saved as pending, the salon is
// told, and the customer is sent to the salon's own payment page. Nothing is issued
// until the salon sees the money and presses "Paid".
export async function POST(request:Request){
  if(!process.env.DATABASE_URL)return Response.json({error:'Vouchers are not available yet.'},{status:503});
  const c=await readSiteContent();
  if(!c.vouchersEnabled)return Response.json({error:'Vouchers are not available yet.'},{status:404});
  let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>}catch{return Response.json({error:'Invalid request'},{status:400})}
  if(clean(body.website,80))return Response.json({ok:true});
  const option=(c.voucherOptions??[])[Number(body.option)];
  const pay=safePayLink(option?.link);
  if(!option||!pay||!(option.amount>0))return Response.json({error:'Please choose a voucher.'},{status:400});
  const buyer_name=clean(body.name,80), email=clean(body.email,120).toLowerCase();
  if(!buyer_name)return Response.json({error:'Please add your name.'},{status:400});
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return Response.json({error:'Please add your email, so we can send you the voucher.'},{status:400});
  const ip=clientIp(request);
  if(limiter.isLimited(ip))return Response.json({error:'That is several orders already. Please get in touch instead.'},{status:429});
  const v=await createVoucherOrder({amount_pennies:Math.round(option.amount*100),buyer_name,buyer_email:email,
    recipient_name:clean(body.recipient,80)||null,message:clean(body.message,240)||null});
  limiter.record(ip);
  const n=await notifyVoucherOrder(v).catch(()=>null);
  if(n&&!n.ok&&n.reason==='failed')console.error('Voucher order alert failed:',n.detail);
  return Response.json({ok:true,payUrl:pay});
}
