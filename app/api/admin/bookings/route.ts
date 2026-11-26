import {isAdmin} from '@/lib/auth';
import {listBookingRequests,setBookingStatus,countNewBookingRequests,setAppointment,upcomingAppointments,shortNoticeList,type BookingStatus} from '@/lib/db';
import {sendAppointmentConfirmation} from '@/lib/booking-alerts';

const STATUSES:BookingStatus[]=['new','offered','confirmed','declined'];

export async function GET(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const status=new URL(request.url).searchParams.get('status')??'all';
  const [requests,newCount,upcoming,shortNotice]=await Promise.all([listBookingRequests(status),countNewBookingRequests(),upcomingAppointments(14),shortNoticeList()]);
  return Response.json({requests,newCount,upcoming,shortNotice});
}

export async function PUT(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const body=await request.json().catch(()=>({})) as {id?:number;status?:BookingStatus;appointmentAt?:string|null;notify?:boolean};
  const id=Number(body.id);
  if(!Number.isInteger(id)||id<1)return Response.json({error:'Unknown request'},{status:400});

  // Confirming with a time: store it, and email the customer if Emma asked to.
  if(body.appointmentAt!==undefined){
    let at:string|null=null;
    if(body.appointmentAt){
      const d=new Date(body.appointmentAt);
      if(Number.isNaN(d.getTime()))return Response.json({error:'That date and time does not look right.'},{status:400});
      at=d.toISOString();
    }
    const row=await setAppointment(id,at);
    if(!row)return Response.json({error:'Unknown request'},{status:404});
    let emailed:'sent'|'no-email'|'failed'|'off'='off';
    if(body.notify&&at){
      const r=await sendAppointmentConfirmation(row).catch(e=>({ok:false as const,reason:'failed' as const,detail:String(e)}));
      emailed=r===null?'no-email':r.ok?'sent':'failed';
      if(r&&!r.ok)console.error('Appointment confirmation failed:',r.detail);
    }
    return Response.json({ok:true,request:row,emailed,newCount:await countNewBookingRequests()});
  }

  if(!body.status||!STATUSES.includes(body.status))return Response.json({error:'Unknown request or status'},{status:400});
  await setBookingStatus(id,body.status);
  return Response.json({ok:true,newCount:await countNewBookingRequests()});
}
