import {type Provider,type Entry,getJson,url,day} from '../types';

// Stripe: a restricted, read-only key the business creates in its own Stripe
// dashboard. Reads balance transactions, which carry the amount and Stripe's fee.
const api=()=>url('stripe','API','https://api.stripe.com');
type BT={id:string;amount:number;fee:number;currency:string;type:string;created:number;description?:string|null};

export function fromStripe(t:BT):Entry[]{
  if(t.currency!=='gbp')return [];
  const on=day(new Date(t.created*1000).toISOString());
  const out:Entry[]=[];
  if(t.type==='charge'||t.type==='payment'){
    out.push({kind:'in',amount_pennies:t.amount,occurred_on:on,category:'Takings',description:t.description||'Stripe payment',external_id:`stripe:${t.id}`});
  }else if(t.type==='refund'||t.type==='payment_refund'){
    out.push({kind:'out',amount_pennies:Math.abs(t.amount),occurred_on:on,category:'Refunds',description:'Stripe refund',external_id:`stripe:${t.id}`});
  }else if(t.type==='stripe_fee'){
    out.push({kind:'out',amount_pennies:Math.abs(t.amount),occurred_on:on,category:'Card fees',description:'Stripe fees',external_id:`stripe:${t.id}`});
  }
  if(t.fee>0&&(t.type==='charge'||t.type==='payment'))out.push({kind:'out',amount_pennies:t.fee,occurred_on:on,category:'Card fees',description:'Stripe fee',external_id:`stripe-fee:${t.id}`});
  return out;
}

export const stripe:Provider={
  id:'stripe',name:'Stripe',category:'payments',auth:'apikey',verified:false,
  blurb:'Online and card takings, refunds and Stripe fees.',
  keyLabel:'Stripe restricted key (read only)',
  keySteps:['Sign in to dashboard.stripe.com.','Go to Developers → API keys → Create restricted key.','Give it a name, set Balance to Read and leave everything else as None. Create it and copy the key (it starts rk_live_).'],
  available:()=>true,
  async connectKey(key){
    if(!/^rk_(live|test)_/.test(key.trim()))throw new Error('Please use a restricted key (it starts rk_live_), not your secret key.');
    await getJson(api()+'/v1/balance_transactions?limit=1',{Authorization:`Bearer ${key.trim()}`});
    return {cred:{key:key.trim()},meta:{account:'Stripe account'}};
  },
  async sync({cred,since}){
    const out:Entry[]=[];let after='';
    for(let page=0;page<100;page++){
      const q=`limit=100&created[gte]=${Math.floor(since.getTime()/1000)}${after?`&starting_after=${after}`:''}`;
      const d=await getJson(`${api()}/v1/balance_transactions?${q}`,{Authorization:`Bearer ${cred.key}`}) as {data:BT[];has_more:boolean};
      for(const t of d.data)out.push(...fromStripe(t));
      if(!d.has_more||!d.data.length)break;
      after=d.data[d.data.length-1].id;
    }
    return out;
  },
};
