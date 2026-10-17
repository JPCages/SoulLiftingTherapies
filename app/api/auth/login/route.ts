import {NextResponse} from 'next/server';
import {adminCookie,createAdminToken,safeEqual} from '@/lib/auth';
import {CUSTOMER_COOKIE,createCustomerToken,verifyPassword} from '@/lib/customer-auth';
import {getCustomerByEmail} from '@/lib/db';
import {LOGIN_THROTTLED,clientIp,loginLimiter} from '@/lib/rate-limit';

// One sign-in for everyone. Emma's admin email → admin; anyone else → their customer account.
export async function POST(request:Request){
  const ip=clientIp(request);
  if(loginLimiter.isLimited(ip))return NextResponse.json(LOGIN_THROTTLED,{status:429});
  loginLimiter.record(ip);

  const {email,password}=await request.json() as {email?:string;password?:string};
  const e=(email??'').trim().toLowerCase();
  if(!e||!password)return NextResponse.json({error:'Enter your email and password'},{status:400});

  // Admin (Emma)
  if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD&&e===process.env.ADMIN_EMAIL.toLowerCase()){
    if(!safeEqual(password,process.env.ADMIN_PASSWORD))return NextResponse.json({error:'That email or password is not correct.'},{status:401});
    const res=NextResponse.json({role:'admin'});
    res.cookies.set(adminCookie,createAdminToken(e),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*12});
    return res;
  }

  // Customer
  if(!process.env.DATABASE_URL)return NextResponse.json({error:'Customer accounts are not available yet.'},{status:503});
  const customer=await getCustomerByEmail(e);
  if(!customer||!verifyPassword(password,customer.password_hash))return NextResponse.json({error:'That email or password is not correct.'},{status:401});
  const res=NextResponse.json({role:'customer',name:customer.name});
  res.cookies.set(CUSTOMER_COOKIE,createCustomerToken(customer.id),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30});
  return res;
}
