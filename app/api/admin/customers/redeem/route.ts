import {isAdmin} from '@/lib/auth';
import {recordPointEvent,getPointsBalance,readSiteContent} from '@/lib/db';

// Redeem one reward: subtracts the reward threshold from the customer's balance.
export async function POST(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const {customerId}=await request.json() as {customerId?:number};
  if(!customerId)return Response.json({error:'Missing customer'},{status:400});
  const content=await readSiteContent();
  const threshold=content.loyaltyRewardPoints??40;
  const balance=await getPointsBalance(customerId);
  if(balance<threshold)return Response.json({error:'Not enough points to redeem a reward yet'},{status:400});
  await recordPointEvent(customerId,-threshold,`Reward redeemed · ${content.loyaltyRewardText??'Reward'}`);
  const newBalance=await getPointsBalance(customerId);
  return Response.json({ok:true,balance:newBalance});
}
