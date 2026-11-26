import {type Provider,type Entry,getJson,postForm,url,env} from '../types';
import {tokenFrom,freshToken} from '../oauth';

// Sage Accounting (UK/IE, API v3.1): the business signs in and approves read-only
// access. Brings in purchase invoices and other payments as costs.
// Needs a Sage developer app (SAGE_CLIENT_ID/SECRET). Built from Sage's auth guide;
// the list endpoints follow Sage's v3.1 naming and must be checked on a trial account.
const authUrl=()=>url('sage','AUTH','https://www.sageone.com');
const tokenUrl=()=>url('sage','TOKEN','https://oauth.accounting.sage.com/token');
const api=()=>url('sage','API','https://api.accounting.sage.com/v3.1');
const client=()=>({id:env('SAGE_CLIENT_ID'),secret:env('SAGE_CLIENT_SECRET')});
type Item={id:string;date:string;total_amount:number|string;currency?:{id?:string};contact?:{displayed_as?:string};contact_name?:string;transaction_type?:{id?:string}};

export function fromSage(t:Item,kind:'invoice'|'payment'):Entry|null{
  if(t.currency?.id&&t.currency.id!=='GBP')return null;
  if(kind==='payment'&&t.transaction_type?.id&&!/PAYMENT/i.test(t.transaction_type.id))return null;
  const v=Math.abs(Number(t.total_amount));
  if(!Number.isFinite(v)||v===0)return null;
  return {kind:'out',amount_pennies:Math.round(v*100),occurred_on:String(t.date).slice(0,10),category:kind==='invoice'?'Bills (Sage)':'Spending (Sage)',description:t.contact?.displayed_as||t.contact_name||null,external_id:`sage-${kind}:${t.id}`};
}

export const sage:Provider={
  id:'sage',name:'Sage Accounting',category:'accounting',auth:'oauth',verified:false,
  blurb:'Brings in your purchase invoices and payments out so margins and cashflow are complete. Read only.',
  envNames:['SAGE_CLIENT_ID','SAGE_CLIENT_SECRET'],
  available:()=>Boolean(client().id&&client().secret),
  authorizeUrl(state,redirectUri){
    return `${authUrl()}/oauth2/auth/central?${new URLSearchParams({filter:'apiv3.1',response_type:'code',client_id:client().id,redirect_uri:redirectUri,scope:'readonly',state,country:'gb'})}`;
  },
  async exchangeCode(code,redirectUri){
    const res=await postForm(tokenUrl(),{grant_type:'authorization_code',code,redirect_uri:redirectUri,client_id:client().id,client_secret:client().secret});
    return {cred:{...tokenFrom(res)},meta:{account:'Sage business'}};
  },
  async sync({cred,since,updateCred}){
    const access=await freshToken(cred,tokenUrl(),client(),updateCred,{basicAuth:false});
    const out:Entry[]=[];
    for(const [path,kind] of [['purchase_invoices','invoice'],['other_payments','payment']] as const){
      let next:string|null=`${api()}/${path}?${new URLSearchParams({from_date:since.toISOString().slice(0,10),items_per_page:'200',attributes:'date,total_amount,currency,contact,transaction_type'})}`;
      for(let page=0;page<50&&next;page++){
        const r=await getJson(next,{Authorization:`Bearer ${access}`}) as {$items?:Item[];$next?:string|null};
        for(const t of r.$items??[]){const e=fromSage(t,kind);if(e)out.push(e)}
        next=r.$next?(r.$next.startsWith('http')?r.$next:`${api()}/${r.$next.replace(/^\//,'')}`):null;
      }
    }
    return out;
  },
};
