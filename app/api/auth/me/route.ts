import {isAdmin} from '@/lib/auth';
import {currentCustomerId} from '@/lib/customer-auth';
import {getCustomerById} from '@/lib/db';

// Who is signed in: admin, a customer, or nobody.
export async function GET(){
  if(await isAdmin())return Response.json({role:'admin'});
  const id=await currentCustomerId();
  if(id&&process.env.DATABASE_URL){
    const c=await getCustomerById(id);
    if(c)return Response.json({role:'customer',id:c.id,name:c.name,email:c.email});
  }
  return Response.json({role:null});
}
