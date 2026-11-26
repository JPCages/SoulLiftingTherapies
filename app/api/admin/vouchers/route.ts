import {isAdmin} from '@/lib/auth';
import {listVouchers,issueVoucher,voidVoucher,redeemVoucher,findVoucher,createVoucherOrder,readSiteContent} from '@/lib/db';
import {makeVoucherCode,expiryFrom,poundsToPennies} from '@/lib/vouchers';
import {sendVoucherToBuyer} from '@/lib/voucher-email';

const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';

async function issue(id:number){
  const c=await readSiteContent();
  const expires=expiryFrom(new Date(),c.voucherExpiryMonths??12);
  // A clash on the random code is very unlikely; try again if it happens.
  for(let i=0;i<5;i++){
    try{return await issueVoucher(id,makeVoucherCode(c.businessName),expires)}
    catch(e){if((e as {code?:string}).code!=='23505')throw e}
  }
  throw new Error('Could not make a unique code');
}

export async function GET(){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  return Response.json({vouchers:await listVouchers()});
}

export async function POST(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const b=await request.json().catch(()=>({})) as Record<string,unknown>;
  const id=Number(b.id);
  switch(b.action){
    case 'issue':{ // Paid: give it a code, and email the buyer if asked.
      const v=await issue(id);
      if(!v)return Response.json({error:'That voucher was already issued or cancelled.'},{status:409});
      let emailed:'sent'|'failed'|'no-email'|'off'='off';
      if(b.notify!==false){const r=await sendVoucherToBuyer(v).catch(()=>({ok:false as const,reason:'failed' as const}));emailed=r===null?'no-email':r.ok?'sent':'failed'}
      return Response.json({ok:true,voucher:v,emailed});
    }
    case 'sell':{ // Sold in person: record and issue in one go.
      const amount=poundsToPennies(b.amount);
      const buyer_name=clean(b.name,80);
      if(!amount||!buyer_name)return Response.json({error:'Add a name and an amount.'},{status:400});
      const email=clean(b.email,120).toLowerCase();
      const order=await createVoucherOrder({amount_pennies:amount,buyer_name,buyer_email:/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)?email:null,recipient_name:clean(b.recipient,80)||null,message:null});
      const v=await issue(order.id);
      let emailed:'sent'|'failed'|'no-email'|'off'='off';
      if(v&&b.notify===true){const r=await sendVoucherToBuyer(v).catch(()=>({ok:false as const,reason:'failed' as const}));emailed=r===null?'no-email':r.ok?'sent':'failed'}
      return Response.json({ok:true,voucher:v,emailed});
    }
    case 'check':{
      const v=await findVoucher(clean(b.code,40));
      return v?Response.json({voucher:v}):Response.json({error:'No voucher with that code'},{status:404});
    }
    case 'redeem':{
      const amount=poundsToPennies(b.amount);
      if(!amount)return Response.json({error:'Add the amount to take off.'},{status:400});
      const r=await redeemVoucher(clean(b.code,40),amount,clean(b.note,120)||null);
      return r.ok?Response.json(r):Response.json({error:r.error},{status:400});
    }
    case 'void':
      if(!Number.isInteger(id))return Response.json({error:'Unknown voucher'},{status:400});
      await voidVoucher(id);return Response.json({ok:true});
  }
  return Response.json({error:'Unknown action'},{status:400});
}
