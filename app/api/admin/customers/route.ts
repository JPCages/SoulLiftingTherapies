import {isAdmin} from '@/lib/auth';
import {listCustomersWithPoints,recordPointEvent,getPointsBalance} from '@/lib/db';
import {readSiteContent} from '@/lib/db';
import {pointsForSpend} from '@/lib/loyalty';

// List all customers with their points balance and total spend.
export async function GET(){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const customers=await listCustomersWithPoints();
  return Response.json({customers});
}

// Log a visit: awards points based on the amount spent (£10 = 1 point by default).
export async function POST(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const {customerId,amount}=await request.json() as {customerId?:number;amount?:number};
  if(!customerId||!amount||amount<=0)return Response.json({error:'Enter a valid customer and amount'},{status:400});
  const amountPennies=Math.round(amount*100);
  const content=await readSiteContent();
  const points=pointsForSpend(amountPennies,content.loyaltyPoundsPerPoint??10);
  await recordPointEvent(customerId,points,`Visit · £${amount.toFixed(2)}`,amountPennies);
  const balance=await getPointsBalance(customerId);
  return Response.json({ok:true,pointsAdded:points,balance});
}
