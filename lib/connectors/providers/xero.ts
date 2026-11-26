import {type Provider,type Entry,getJson,postForm,url,env,day} from '../types';
import {tokenFrom,freshToken} from '../oauth';

// Xero: the business signs in to Xero and approves read-only access. Brings in
// money spent (spend-money bank transactions and supplier bills) as costs.
// Never writes to the books. Needs a Xero developer app (XERO_CLIENT_ID/SECRET).
// Built from Xero's documentation and its SDK guides; check against a demo
// company before switching on for a client.
const login=()=>url('xero','LOGIN','https://login.xero.com');
const identity=()=>url('xero','IDENTITY','https://identity.xero.com');
const api=()=>url('xero','API','https://api.xero.com');
const client=()=>({id:env('XERO_CLIENT_ID'),secret:env('XERO_CLIENT_SECRET')});
// Granular read scopes (Xero split accounting.transactions in 2026).
const SCOPES='offline_access accounting.banktransactions.read accounting.invoices.read';

// Xero dates come as "/Date(1700000000000+0000)/" or ISO.
export function xeroDate(d:string):string{
  const m=d.match(/\/Date\((\d+)/);
  return m?day(new Date(Number(m[1])).toISOString()):day(d);
}
type Txn={BankTransactionID?:string;InvoiceID?:string;Total:number;Date?:string;DateString?:string;CurrencyCode?:string;Status?:string;Contact?:{Name?:string}};
export function fromXero(t:Txn,kind:'spend'|'bill'):Entry|null{
  const id=t.BankTransactionID||t.InvoiceID;
  if(!id||(t.CurrencyCode&&t.CurrencyCode!=='GBP')||t.Status==='DELETED'||t.Status==='VOIDED'||t.Status==='DRAFT')return null;
  return {kind:'out',amount_pennies:Math.round(Math.abs(t.Total)*100),occurred_on:xeroDate(t.DateString||t.Date||''),category:kind==='bill'?'Bills (Xero)':'Spending (Xero)',description:t.Contact?.Name||null,external_id:`xero-${kind}:${id}`};
}

export const xero:Provider={
  id:'xero',name:'Xero',category:'accounting',auth:'oauth',verified:false,
  blurb:'Brings in your costs (bills and money spent) so margins and cashflow are complete. Read only.',
  envNames:['XERO_CLIENT_ID','XERO_CLIENT_SECRET'],
  available:()=>Boolean(client().id&&client().secret),
  authorizeUrl(state,redirectUri){
    return `${login()}/identity/connect/authorize?${new URLSearchParams({response_type:'code',client_id:client().id,redirect_uri:redirectUri,scope:SCOPES,state})}`;
  },
  async exchangeCode(code,redirectUri){
    const res=await postForm(`${identity()}/connect/token`,{grant_type:'authorization_code',code,redirect_uri:redirectUri},{user:client().id,pass:client().secret});
    const t=tokenFrom(res);
    const conns=await getJson(`${api()}/connections`,{Authorization:`Bearer ${t.access_token}`}) as {tenantId:string;tenantName?:string}[];
    if(!conns[0])throw new Error('No Xero organisation was shared.');
    return {cred:{...t},meta:{account:conns[0].tenantName||'Xero organisation',tenant:conns[0].tenantId}};
  },
  async sync({cred,meta,since,updateCred}){
    const access=await freshToken(cred,`${identity()}/connect/token`,client(),updateCred);
    const h={Authorization:`Bearer ${access}`,'xero-tenant-id':meta.tenant};
    const d=since;const dt=`DateTime(${d.getUTCFullYear()},${String(d.getUTCMonth()+1).padStart(2,'0')},${String(d.getUTCDate()).padStart(2,'0')})`;
    const out:Entry[]=[];
    for(const [path,key,kind,where] of [
      ['BankTransactions','BankTransactions','spend',`Type=="SPEND" AND Date>=${dt}`],
      ['Invoices','Invoices','bill',`Type=="ACCPAY" AND Date>=${dt}`],
    ] as const){
      for(let page=1;page<=50;page++){
        const r=await getJson(`${api()}/api.xro/2.0/${path}?${new URLSearchParams({where,page:String(page),pageSize:'100'})}`,h) as Record<string,Txn[]>;
        const list=r[key]??[];
        for(const t of list){const e=fromXero(t,kind);if(e)out.push(e)}
        if(list.length<100)break;
      }
    }
    return out;
  },
};
