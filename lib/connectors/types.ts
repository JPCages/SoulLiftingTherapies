// One shape for every outside system a business can connect: card payments,
// accounting, and later bookings or marketing. Each provider is a small adapter;
// the desk, storage and sync are shared, so adding a provider is one file.

export type Category='payments'|'accounting';
export type Credentials=Record<string,string|number|undefined>;
export type Meta=Record<string,string>;

// What an adapter hands back: money entries in the shared format (pence).
export type Entry={kind:'in'|'out';amount_pennies:number;occurred_on:string;category:string;description:string|null;external_id:string};

export type SyncContext={
  cred:Credentials; meta:Meta; since:Date; now:Date;
  // Adapters call this when a token was refreshed, so the new one is saved.
  updateCred:(c:Credentials)=>Promise<void>;
};

export type Provider={
  id:string; name:string; category:Category; auth:'oauth'|'apikey';
  blurb:string;                    // one line on what connecting brings in
  keyLabel?:string; keySteps?:string[]; // for API-key providers: where to create the key
  envNames?:string[];              // Railway variables the site needs (OAuth app details)
  verified?:boolean;               // false = built from documentation, not yet tried against a real account
  available():boolean;             // can this site offer it (e.g. OAuth app details set)?
  authorizeUrl?(state:string,redirectUri:string):string;
  exchangeCode?(code:string,redirectUri:string,query:URLSearchParams):Promise<{cred:Credentials;meta:Meta}>;
  connectKey?(key:string):Promise<{cred:Credentials;meta:Meta}>;
  sync(ctx:SyncContext):Promise<Entry[]>;
};

// Shared helpers for adapters.
export const toPence=(major:number)=>Math.round(major*100);
export const day=(iso:string)=>iso.slice(0,10);
export function env(name:string){return process.env[name]?.trim()||''}
// Each provider's URLs can be pointed at a stand-in server in tests: CONNECT_<ID>_<NAME>.
export function url(id:string,name:string,fallback:string){return env(`CONNECT_${id.toUpperCase()}_${name}`)||fallback}

export async function getJson(u:string,headers:Record<string,string>):Promise<unknown>{
  const r=await fetch(u,{headers:{Accept:'application/json',...headers},cache:'no-store'});
  if(r.status===401||r.status===403)throw new ConnectionError('The connection was refused. It may have been removed on the other side — please connect again.',true);
  if(r.status===429)throw new ConnectionError('Too many requests just now. Try again in a few minutes.');
  if(!r.ok)throw new ConnectionError(`The other system did not answer (${r.status}). Try again later.`);
  return r.json();
}
export async function postForm(u:string,body:Record<string,string>,basic?:{user:string;pass:string}):Promise<Record<string,unknown>>{
  const headers:Record<string,string>={'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'};
  if(basic)headers.Authorization='Basic '+Buffer.from(`${basic.user}:${basic.pass}`).toString('base64');
  const r=await fetch(u,{method:'POST',headers,body:new URLSearchParams(body).toString(),cache:'no-store'});
  const out=await r.json().catch(()=>({})) as Record<string,unknown>;
  if(!r.ok)throw new ConnectionError(r.status===400||r.status===401?'The sign-in was refused. Please connect again.':`Could not finish connecting (${r.status}).`,r.status===400||r.status===401);
  return out;
}
export async function postJson(u:string,body:Record<string,string>):Promise<Record<string,unknown>>{
  const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const out=await r.json().catch(()=>({})) as Record<string,unknown>;
  if(!r.ok)throw new ConnectionError(r.status===400||r.status===401?'The sign-in was refused. Please connect again.':`Could not finish connecting (${r.status}).`,r.status===400||r.status===401);
  return out;
}
export class ConnectionError extends Error{constructor(msg:string,public reconnect=false){super(msg)}}
