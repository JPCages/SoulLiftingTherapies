import {NextResponse} from 'next/server';
import {adminCookie} from '@/lib/auth';
import {CUSTOMER_COOKIE} from '@/lib/customer-auth';

export async function POST(){
  const res=NextResponse.json({ok:true});
  res.cookies.set(CUSTOMER_COOKIE,'',{path:'/',maxAge:0});
  res.cookies.set(adminCookie,'',{path:'/',maxAge:0});
  return res;
}
