import {postForm,postJson,type Credentials} from './types';

// Standard OAuth 2 token handling used by the OAuth providers.
export type TokenSet={access_token:string;refresh_token?:string;expires_at?:number};

export function tokenFrom(res:Record<string,unknown>,old?:Credentials):TokenSet{
  const access=String(res.access_token??'');
  if(!access)throw new Error('No access token came back');
  const expires=Number(res.expires_in);
  return {access_token:access,refresh_token:(res.refresh_token as string|undefined)??(old?.refresh_token as string|undefined),expires_at:Number.isFinite(expires)?Date.now()+expires*1000:undefined};
}

// Returns a valid access token, refreshing (and saving the new refresh token) when it is
// within a minute of expiring. Providers that rotate refresh tokens are covered by saving
// whatever comes back every time.
export async function freshToken(cred:Credentials,tokenUrl:string,client:{id:string;secret:string},save:(c:Credentials)=>Promise<void>,opts:{basicAuth:boolean;json?:boolean}={basicAuth:true}):Promise<string>{
  const exp=Number(cred.expires_at??0);
  if(cred.access_token&&exp&&exp-Date.now()>60_000)return String(cred.access_token);
  if(!cred.refresh_token)return String(cred.access_token??'');
  const body:Record<string,string>={grant_type:'refresh_token',refresh_token:String(cred.refresh_token)};
  if(!opts.basicAuth){body.client_id=client.id;body.client_secret=client.secret}
  const res=opts.json?await postJson(tokenUrl,body):await postForm(tokenUrl,body,opts.basicAuth?{user:client.id,pass:client.secret}:undefined);
  const t=tokenFrom(res,cred);
  const next={...cred,...t};
  await save(next);
  return t.access_token;
}
