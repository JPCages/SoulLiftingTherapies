import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {isAdmin} from '@/lib/auth';
import {providerById} from '@/lib/connectors/registry';
import {signState,connectorsEnabled} from '@/lib/connectors/crypto';
import {callbackUrl,publicOrigin} from '@/lib/connectors/redirect';

const NONCE_COOKIE='soul_connect';

// Sends Emma to the provider to approve access. A one-time value goes in a short-lived
// cookie and in the signed state, so the reply can only complete her own request.
export async function GET(request:Request){
  if(!(await isAdmin()))return NextResponse.redirect(new URL('/login',publicOrigin(request)));
  const id=new URL(request.url).searchParams.get('provider')??'';
  const p=providerById(id);
  const back=(msg:string)=>NextResponse.redirect(new URL(`/portal?section=connections&error=${encodeURIComponent(msg)}`,publicOrigin(request)));
  if(!p||p.auth!=='oauth'||!p.authorizeUrl)return back('That system is not connected by signing in.');
  if(!connectorsEnabled()||!p.available())return back(`${p?.name??'That system'} is not switched on for this site yet.`);
  const nonce=randomBytes(16).toString('hex');
  const res=NextResponse.redirect(p.authorizeUrl(signState(id,nonce),callbackUrl(id,request)));
  res.cookies.set(NONCE_COOKIE,nonce,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/connections',maxAge:15*60});
  return res;
}
