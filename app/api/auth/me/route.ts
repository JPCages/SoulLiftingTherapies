import {isAdmin} from '@/lib/auth';
import {currentCustomerId} from '@/lib/customer-auth';
import {getCustomerById,getPointsBalance,listRequestsForCustomer,coursesForCustomer} from '@/lib/db';

// Who is signed in: admin, a customer, or nobody.
export async function GET(){
  if(await isAdmin())return Response.json({role:'admin'});
  const id=await currentCustomerId();
  if(id&&process.env.DATABASE_URL){
    const c=await getCustomerById(id);
    if(c){
      const points=await getPointsBalance(c.id);
      const requests=await listRequestsForCustomer(c.id).catch(()=>[]);
      const courses=(await coursesForCustomer(c.id).catch(()=>[])).map(x=>({id:x.id,title:x.title,sessions_total:x.sessions_total,sessions_used:x.sessions_used,expires_on:x.expires_on}));
      return Response.json({role:'customer',id:c.id,name:c.name,email:c.email,points,requests,courses});
    }
  }
  return Response.json({role:null});
}
