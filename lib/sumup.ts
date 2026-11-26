import {addMoneyEntry,getSetting,setSetting} from './db';
import {fromSumUp,type SumUpTx} from './money';

// Pull card takings and fees from SumUp into the Money tab.
// Uses a secret API key Emma creates in her SumUp account; it is set as a
// Railway variable (SUMUP_API_KEY), never typed into the desk or stored here.
// SUMUP_API_BASE exists only so tests can point at a stand-in server.
const API=process.env.SUMUP_API_BASE?.trim()||'https://api.sumup.com';
export const SUMUP_SYNC_KEY='sumup_last_sync';

export function sumupConfigured(){return Boolean(process.env.SUMUP_API_KEY?.trim())}

async function call(path:string){
  const r=await fetch(API+path,{headers:{Authorization:`Bearer ${process.env.SUMUP_API_KEY!.trim()}`},cache:'no-store'});
  if(r.status===401||r.status===403)throw new Error('SumUp refused the key. It may have been deleted in SumUp — create a new one and ask JP to update it.');
  if(!r.ok)throw new Error(`SumUp did not answer (${r.status}). Try again in a minute.`);
  return r.json();
}

// The merchant code comes from the Railway variable, or is looked up from the key.
async function merchantCode():Promise<string>{
  const set=process.env.SUMUP_MERCHANT_CODE?.trim();
  if(set)return set;
  const me=await call('/v0.1/me') as {merchant_profile?:{merchant_code?:string}};
  const code=me.merchant_profile?.merchant_code;
  if(!code)throw new Error('Could not find your SumUp merchant code. Ask JP to add SUMUP_MERCHANT_CODE.');
  return code;
}

export type SyncResult={added:number;fees:number;since:string};
export async function syncSumUp(now=new Date()):Promise<SyncResult>{
  if(!sumupConfigured())throw new Error('SumUp is not connected yet.');
  const code=await merchantCode();
  const last=await getSetting(SUMUP_SYNC_KEY);
  // First sync looks back 13 months, after that only what changed since last time.
  const since=last??new Date(now.getTime()-400*24*60*60*1000).toISOString();
  let path=`/v2.1/merchants/${encodeURIComponent(code)}/transactions/history?limit=100&order=ascending&changes_since=${encodeURIComponent(since)}`;
  let added=0;
  for(let page=0;page<60&&path;page++){
    const d=await call(path) as {items?:SumUpTx[];links?:{rel:string;href:string}[]};
    for(const t of d.items??[]){
      const e=fromSumUp(t);
      if(e&&await addMoneyEntry({...e,source:'sumup'}))added++;
    }
    const next=d.links?.find(l=>l.rel==='next')?.href;
    path=next?`/v2.1/merchants/${encodeURIComponent(code)}/transactions/history?${next.replace(/^\?/,'')}`:'';
  }
  // Card fees come with SumUp's payouts to Emma's bank.
  const start=since.slice(0,10), end=now.toISOString().slice(0,10);
  const payouts=await call(`/v1.0/merchants/${encodeURIComponent(code)}/payouts?start_date=${start}&end_date=${end}&limit=9999`) as {id:number;date:string;fee?:number;currency:string;status:string}[];
  let fees=0;
  for(const p of Array.isArray(payouts)?payouts:[]){
    if(p.currency!=='GBP'||!p.fee||p.status!=='SUCCESSFUL')continue;
    if(await addMoneyEntry({kind:'out',source:'sumup',amount_pennies:Math.round(Math.abs(p.fee)*100),occurred_on:p.date.slice(0,10),category:'Card fees',description:'SumUp fees',external_id:`sumup-fee:${p.id}`}))fees++;
  }
  await setSetting(SUMUP_SYNC_KEY,now.toISOString());
  return {added,fees,since};
}
