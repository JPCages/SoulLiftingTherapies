import {type Provider,type Entry,getJson,postForm,url,env} from '../types';
import {tokenFrom,freshToken} from '../oauth';

// FreeAgent: the business signs in and approves access. Brings in supplier bills as
// costs. Read only. Needs a FreeAgent developer app (FREEAGENT_CLIENT_ID/SECRET).
// Built from FreeAgent's API docs (bills, OAuth, paging).
const sandbox=()=>env('FREEAGENT_ENV')==='sandbox';
const base=()=>url('freeagent','API',sandbox()?'https://api.sandbox.freeagent.com':'https://api.freeagent.com');
const client=()=>({id:env('FREEAGENT_CLIENT_ID'),secret:env('FREEAGENT_CLIENT_SECRET')});
type Bill={url:string;dated_on:string;total_value:string;currency?:string;status?:string;reference?:string};

export function fromFreeAgent(b:Bill):Entry|null{
  if((b.currency&&b.currency!=='GBP')||b.status==='Zero Value')return null;
  const v=parseFloat(b.total_value);
  if(!Number.isFinite(v)||v===0)return null;
  const id=b.url.split('/').pop();
  return v<0
    ?{kind:'in',amount_pennies:Math.round(-v*100),occurred_on:b.dated_on,category:'Supplier refunds (FreeAgent)',description:b.reference||null,external_id:`freeagent-bill:${id}`}
    :{kind:'out',amount_pennies:Math.round(v*100),occurred_on:b.dated_on,category:'Bills (FreeAgent)',description:b.reference||null,external_id:`freeagent-bill:${id}`};
}

export const freeagent:Provider={
  id:'freeagent',name:'FreeAgent',category:'accounting',auth:'oauth',verified:false,
  blurb:'Brings in your bills so margins and cashflow are complete. Read only.',
  envNames:['FREEAGENT_CLIENT_ID','FREEAGENT_CLIENT_SECRET'],
  available:()=>Boolean(client().id&&client().secret),
  authorizeUrl(state,redirectUri){
    return `${base()}/v2/approve_app?${new URLSearchParams({client_id:client().id,response_type:'code',redirect_uri:redirectUri,state})}`;
  },
  async exchangeCode(code,redirectUri){
    const res=await postForm(`${base()}/v2/token_endpoint`,{grant_type:'authorization_code',code,redirect_uri:redirectUri},{user:client().id,pass:client().secret});
    return {cred:{...tokenFrom(res)},meta:{account:'FreeAgent account'}};
  },
  async sync({cred,since,updateCred}){
    const access=await freshToken(cred,`${base()}/v2/token_endpoint`,client(),updateCred);
    const out:Entry[]=[];
    for(let page=1;page<=50;page++){
      const r=await getJson(`${base()}/v2/bills?${new URLSearchParams({from_date:since.toISOString().slice(0,10),per_page:'100',page:String(page)})}`,{Authorization:`Bearer ${access}`}) as {bills?:Bill[]};
      const list=r.bills??[];
      for(const b of list){const e=fromFreeAgent(b);if(e)out.push(e)}
      if(list.length<100)break;
    }
    return out;
  },
};
