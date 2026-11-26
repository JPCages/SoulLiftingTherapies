import {type Provider,type Entry,getJson,url,day,toPence} from '../types';
import {fromSumUp,type SumUpTx} from '../../money';

// SumUp: secret API key the business creates in its own SumUp account.
// Verified against SumUp's API docs; tested with a stand-in server.
const api=()=>url('sumup','API',process.env.SUMUP_API_BASE?.trim()||'https://api.sumup.com');
const call=(path:string,key:string)=>getJson(api()+path,{Authorization:`Bearer ${key}`});

export const sumup:Provider={
  id:'sumup',name:'SumUp',category:'payments',auth:'apikey',verified:true,
  blurb:'Card takings, refunds and SumUp fees.',
  keyLabel:'SumUp secret API key',
  keySteps:['Sign in at me.sumup.com.','Open your profile, then Settings → For Developers → Toolkit → API Keys.','Press Create, name it "Website", and copy the key (it starts sup_sk_). SumUp only shows it once.'],
  available:()=>true,
  async connectKey(key){
    const me=await call('/v0.1/me',key) as {merchant_profile?:{merchant_code?:string;company_name?:string}};
    const code=me.merchant_profile?.merchant_code;
    if(!code)throw new Error('SumUp accepted the key but did not give a merchant code.');
    return {cred:{key},meta:{account:me.merchant_profile?.company_name||code,merchant_code:code}};
  },
  async sync({cred,meta,since,now}){
    const key=String(cred.key),code=encodeURIComponent(meta.merchant_code);
    const out:Entry[]=[];
    let path=`/v2.1/merchants/${code}/transactions/history?limit=100&order=ascending&changes_since=${encodeURIComponent(since.toISOString())}`;
    for(let page=0;page<60&&path;page++){
      const d=await call(path,key) as {items?:SumUpTx[];links?:{rel:string;href:string}[]};
      for(const t of d.items??[]){const e=fromSumUp(t);if(e)out.push({...e,external_id:e.external_id})}
      const next=d.links?.find(l=>l.rel==='next')?.href;
      path=next?`/v2.1/merchants/${code}/transactions/history?${next.replace(/^\?/,'')}`:'';
    }
    const payouts=await call(`/v1.0/merchants/${code}/payouts?start_date=${day(since.toISOString())}&end_date=${day(now.toISOString())}&limit=9999`,key) as {id:number;date:string;fee?:number;currency:string;status:string}[];
    for(const p of Array.isArray(payouts)?payouts:[]){
      if(p.currency!=='GBP'||!p.fee||p.status!=='SUCCESSFUL')continue;
      out.push({kind:'out',amount_pennies:toPence(Math.abs(p.fee)),occurred_on:day(p.date),category:'Card fees',description:'SumUp fees',external_id:`sumup-fee:${p.id}`});
    }
    return out;
  },
};
