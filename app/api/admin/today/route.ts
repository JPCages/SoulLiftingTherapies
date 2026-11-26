import {isAdmin} from '@/lib/auth';
import {getSetting,listBookingRequests,listCustomersWithPoints,readSiteContent,upcomingAppointments,listVouchers} from '@/lib/db';
import {CHECKLIST_KEY,parseAnswers,checklistStatus} from '@/lib/checklist';

// Emma's "Today" view: what needs her attention, in one request.
export async function GET(){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const [content,waiting,customers,answers,upcoming,vouchers]=await Promise.all([
    readSiteContent(),
    listBookingRequests('new'),
    listCustomersWithPoints(),
    getSetting(CHECKLIST_KEY).then(parseAnswers),
    upcomingAppointments(2).catch(()=>[]),
    listVouchers().catch(()=>[]),
  ]);
  const need=content.loyaltyRewardPoints??40;
  const fortnight=Date.now()-14*24*60*60*1000;
  const items=checklistStatus(content,answers);
  return Response.json({
    requests:{count:waiting.length,latest:waiting.slice(0,5).map(r=>({id:r.id,name:r.name,treatment:r.treatment,location:r.location,created_at:r.created_at}))},
    rewardsReady:content.loyaltyEnabled===false?[]:customers.filter(c=>c.balance>=need).map(c=>({id:c.id,name:c.name,balance:c.balance})),
    newSignups:customers.filter(c=>new Date(c.created_at).getTime()>=fortnight).slice(0,8).map(c=>({id:c.id,name:c.name,created_at:c.created_at})),
    customerCount:customers.length,
    // Booked appointments for today and tomorrow (UK days), and voucher orders to check.
    appointments:upcoming.map(r=>({id:r.id,name:r.name,treatment:r.treatment,location:r.location,phone:r.phone,at:r.appointment_at})),
    vouchersWaiting:vouchers.filter(v=>v.status==='pending').length,
    todo:{done:items.filter(i=>i.done).length,total:items.length,next:items.find(i=>!i.done)?.title??null},
  });
}
