import {type Provider,type Entry,getJson,postForm,url,env} from '../types';
import {tokenFrom,freshToken} from '../oauth';

// QuickBooks Online: the business signs in to Intuit and approves access. Brings in
// expenses (Purchase) and supplier bills (Bill) as costs. Read only.
// Needs an Intuit developer app (QUICKBOOKS_CLIENT_ID/SECRET). Built from Intuit's
// documented flow via secondary guides; check against a sandbox company first.
const sandbox=()=>env('QUICKBOOKS_ENV')==='sandbox';
const authBase=()=>url('quickbooks','AUTH','https://appcenter.intuit.com');
const tokenUrl=()=>url('quickbooks','TOKEN','https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer');
const api=()=>url('quickbooks','API',sandbox()?'https://sandbox-quickbooks.api.intuit.com':'https://quickbooks.api.intuit.com');
const client=()=>({id:env('QUICKBOOKS_CLIENT_ID'),secret:env('QUICKBOOKS_CLIENT_SECRET')});
type Txn={Id:string;TotalAmt:number;TxnDate:string;CurrencyRef?:{value?:string};EntityRef?:{name?:string};VendorRef?:{name?:string}};

export function fromQuickBooks(t:Txn,kind:'purchase'|'bill'):Entry|null{
  if(t.CurrencyRef?.value&&t.CurrencyRef.value!=='GBP')return null;
  return {kind:'out',amount_pennies:Math.round(Math.abs(t.TotalAmt)*100),occurred_on:t.TxnDate,category:kind==='bill'?'Bills (QuickBooks)':'Expenses (QuickBooks)',description:t.VendorRef?.name||t.EntityRef?.name||null,external_id:`qbo-${kind}:${t.Id}`};
}

export const quickbooks:Provider={
  id:'quickbooks',name:'QuickBooks',category:'accounting',auth:'oauth',verified:false,
  blurb:'Brings in your expenses and bills so margins and cashflow are complete. Read only.',
  envNames:['QUICKBOOKS_CLIENT_ID','QUICKBOOKS_CLIENT_SECRET'],
  available:()=>Boolean(client().id&&client().secret),
  authorizeUrl(state,redirectUri){
    return `${authBase()}/connect/oauth2?${new URLSearchParams({client_id:client().id,response_type:'code',scope:'com.intuit.quickbooks.accounting',redirect_uri:redirectUri,state})}`;
  },
  async exchangeCode(code,redirectUri,query){
    const realm=query.get('realmId');
    if(!realm)throw new Error('QuickBooks did not say which company was connected.');
    const res=await postForm(tokenUrl(),{grant_type:'authorization_code',code,redirect_uri:redirectUri},{user:client().id,pass:client().secret});
    return {cred:{...tokenFrom(res)},meta:{account:'QuickBooks company',realm}};
  },
  async sync({cred,meta,since,updateCred}){
    const access=await freshToken(cred,tokenUrl(),client(),updateCred);
    const from=since.toISOString().slice(0,10);
    const out:Entry[]=[];
    for(const [entity,kind] of [['Purchase','purchase'],['Bill','bill']] as const){
      for(let start=1;start<=10000;start+=1000){
        const q=`select * from ${entity} where TxnDate >= '${from}' STARTPOSITION ${start} MAXRESULTS 1000`;
        const r=await getJson(`${api()}/v3/company/${encodeURIComponent(meta.realm)}/query?${new URLSearchParams({query:q,minorversion:'75'})}`,{Authorization:`Bearer ${access}`}) as {QueryResponse?:Record<string,Txn[]>};
        const list=r.QueryResponse?.[entity]??[];
        for(const t of list){const e=fromQuickBooks(t,kind);if(e)out.push(e)}
        if(list.length<1000)break;
      }
    }
    return out;
  },
};
