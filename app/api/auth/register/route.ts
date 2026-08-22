import {NextResponse} from 'next/server';
import {CUSTOMER_COOKIE,createCustomerToken,hashPassword} from '@/lib/customer-auth';
import {createCustomer,getCustomerByEmail} from '@/lib/db';

export async function POST(request:Request){
  if(!process.env.DATABASE_URL)return NextResponse.json({error:'Customer accounts are not available yet.'},{status:503});
  const {name,email,password}=await request.json() as {name?:string;email?:string;password?:string};
  const n=(name??'').trim(), e=(email??'').trim().toLowerCase();
  if(!n||!e||!password)return NextResponse.json({error:'Please fill in your name, email and password.'},{status:400});
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))return NextResponse.json({error:'Please enter a valid email address.'},{status:400});
  if(password.length<8)return NextResponse.json({error:'Please choose a password of at least 8 characters.'},{status:400});
  if(process.env.ADMIN_EMAIL&&e===process.env.ADMIN_EMAIL.toLowerCase())return NextResponse.json({error:'That email is reserved. Please use another.'},{status:409});
  if(await getCustomerByEmail(e))return NextResponse.json({error:'An account with that email already exists. Please sign in.'},{status:409});
  const customer=await createCustomer(n,e,hashPassword(password));
  const res=NextResponse.json({role:'customer',name:customer.name});
  res.cookies.set(CUSTOMER_COOKIE,createCustomerToken(customer.id),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30});
  return res;
}
