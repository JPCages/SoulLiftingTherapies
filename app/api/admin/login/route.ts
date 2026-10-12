import {NextResponse} from 'next/server';
import {adminCookie,createAdminToken,safeEqual} from '@/lib/auth';
import {LOGIN_THROTTLED,clientIp,loginLimiter} from '@/lib/rate-limit';

export async function POST(request:Request){
  const ip=clientIp(request);
  if(loginLimiter.isLimited(ip))return NextResponse.json(LOGIN_THROTTLED,{status:429});
  loginLimiter.record(ip);

  const {email,password}=await request.json() as {email?:string;password?:string};
  const adminEmail=process.env.ADMIN_EMAIL,adminPassword=process.env.ADMIN_PASSWORD;
  const ok=!!adminEmail&&!!adminPassword&&typeof email==='string'&&typeof password==='string'
    &&email.toLowerCase()===adminEmail.toLowerCase()&&safeEqual(password,adminPassword);
  if(!ok)return NextResponse.json({error:'Incorrect email or password'},{status:401});

  const response=NextResponse.json({ok:true});
  response.cookies.set(adminCookie,createAdminToken(email as string),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*12});
  return response;
}
