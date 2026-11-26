import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {isAdmin} from '@/lib/auth';
import {providerById} from '@/lib/connectors/registry';
import {checkState} from '@/lib/connectors/crypto';
import {saveConnection} from '@/lib/connectors/service';
import {callbackUrl,publicOrigin} from '@/lib/connectors/redirect';

// Where a provider sends Emma back after she approves (or declines) access.
export async function GET(request:Request,{params}:{params:Promise<{provider:string}>}){
  const {provider}=await params;
  const url=new URL(request.url);
  const back=(q:string)=>{const r=NextResponse.redirect(new URL(`/portal?section=connections&${q}`,publicOrigin(request)));r.cookies.set('soul_connect','',{path:'/api/connections',maxAge:0});return r};
  if(!(await isAdmin()))return NextResponse.redirect(new URL('/login',publicOrigin(request)));
  const p=providerById(provider);
  if(!p||!p.exchangeCode)return back('error='+encodeURIComponent('Unknown system'));
  if(url.searchParams.get('error'))return back('error='+encodeURIComponent(`${p.name} was not connected: access was not approved.`));
  const nonce=(await cookies()).get('soul_connect')?.value;
  if(checkState(url.searchParams.get('state')??'',nonce)!==provider)return back('error='+encodeURIComponent('That connection request had expired. Please try again.'));
  const code=url.searchParams.get('code');
  if(!code)return back('error='+encodeURIComponent(`${p.name} did not send a code back. Please try again.`));
  try{
    const {cred,meta}=await p.exchangeCode(code,callbackUrl(provider,request),url.searchParams);
    await saveConnection(provider,cred,meta);
    return back('connected='+encodeURIComponent(provider));
  }catch(e){
    return back('error='+encodeURIComponent(e instanceof Error?e.message:`Could not connect ${p.name}`));
  }
}
