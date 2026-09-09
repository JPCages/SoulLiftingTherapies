import {isAdmin} from '@/lib/auth';
import {listBookingRequests,setBookingStatus,countNewBookingRequests,type BookingStatus} from '@/lib/db';

const STATUSES:BookingStatus[]=['new','offered','confirmed','declined'];

export async function GET(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const status=new URL(request.url).searchParams.get('status')??'all';
  const [requests,newCount]=await Promise.all([listBookingRequests(status),countNewBookingRequests()]);
  return Response.json({requests,newCount});
}

export async function PUT(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const {id,status}=await request.json() as {id?:number;status?:BookingStatus};
  if(!id||!status||!STATUSES.includes(status))return Response.json({error:'Unknown request or status'},{status:400});
  await setBookingStatus(id,status);
  return Response.json({ok:true,newCount:await countNewBookingRequests()});
}
