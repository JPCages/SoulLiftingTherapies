import {type Provider,type Entry,getJson,postJson,url,env,day} from '../types';
import {tokenFrom,freshToken} from '../oauth';

// Square: the business signs in to Square and approves read-only access to payments.
// Needs a Square developer app (SQUARE_CLIENT_ID / SQUARE_CLIENT_SECRET in Railway).
const sandbox=()=>env('SQUARE_ENV')==='sandbox';
const base=()=>url('square','API',sandbox()?'https://connect.squareupsandbox.com':'https://connect.squareup.com');
const client=()=>({id:env('SQUARE_CLIENT_ID'),secret:env('SQUARE_CLIENT_SECRET')});
const VERSION='2025-10-16';
type Money={amount?:number;currency?:string};
type Payment={id:string;status:string;created_at:string;amount_money?:Money;refunded_money?:Money;processing_fee?:{amount_money?:Money}[];note?:string};

export function fromSquare(p:Payment):Entry[]{
  if(p.status!=='COMPLETED'||p.amount_money?.currency!=='GBP')return [];
  const on=day(p.created_at);
  const out:Entry[]=[{kind:'in',amount_pennies:p.amount_money.amount??0,occurred_on:on,category:'Takings',description:p.note||'Square payment',external_id:`square:${p.id}`}];
  const fee=(p.processing_fee??[]).reduce((n,f)=>n+(f.amount_money?.amount??0),0);
  if(fee>0)out.push({kind:'out',amount_pennies:fee,occurred_on:on,category:'Card fees',description:'Square fee',external_id:`square-fee:${p.id}`});
  if((p.refunded_money?.amount??0)>0)out.push({kind:'out',amount_pennies:p.refunded_money!.amount!,occurred_on:on,category:'Refunds',description:'Square refund',external_id:`square-refund:${p.id}`});
  return out;
}

export const square:Provider={
  id:'square',name:'Square',category:'payments',auth:'oauth',verified:false,
  blurb:'Card takings, refunds and Square fees.',
  envNames:['SQUARE_CLIENT_ID','SQUARE_CLIENT_SECRET'],
  available:()=>Boolean(client().id&&client().secret),
  authorizeUrl(state){
    const q=new URLSearchParams({client_id:client().id,scope:'PAYMENTS_READ MERCHANT_PROFILE_READ',session:'false',state});
    return `${base()}/oauth2/authorize?${q}`;
  },
  async exchangeCode(code,redirectUri){
    const res=await postJson(`${base()}/oauth2/token`,{client_id:client().id,client_secret:client().secret,code,grant_type:'authorization_code',redirect_uri:redirectUri});
    const t=tokenFrom(res);
    return {cred:{...t},meta:{account:String(res.merchant_id??'Square account')}};
  },
  async sync({cred,since,updateCred}){
    const access=await freshToken(cred,`${base()}/oauth2/token`,client(),updateCred,{basicAuth:false,json:true});
    const out:Entry[]=[];let cursor='';
    for(let page=0;page<100;page++){
      const q=new URLSearchParams({begin_time:since.toISOString(),sort_order:'ASC',limit:'100'});
      if(cursor)q.set('cursor',cursor);
      const d=await getJson(`${base()}/v2/payments?${q}`,{Authorization:`Bearer ${access}`,'Square-Version':VERSION}) as {payments?:Payment[];cursor?:string};
      for(const p of d.payments??[])out.push(...fromSquare(p));
      if(!d.cursor)break;cursor=d.cursor;
    }
    return out;
  },
};
