import {type Provider,type Entry,getJson,postForm,url,day} from '../types';

// Zettle by PayPal: an API key the business creates at my.zettle.com/apps/api-keys,
// swapped for a 2-hour access token each sync (no refresh token in this grant).
// Built from Zettle's published API documentation; fees are not in this API.
const auth=()=>url('zettle','AUTH','https://oauth.zettle.com');
const api=()=>url('zettle','API','https://purchase.izettle.com');
type Purchase={purchaseUUID1?:string;purchaseUUID?:string;amount:number;currency:string;timestamp?:string;created?:string;refund?:boolean};

// The API key is a JWT; its client_id is inside it.
function clientIdFrom(key:string):string{
  try{const p=JSON.parse(Buffer.from(key.split('.')[1]??'','base64url').toString('utf8')) as Record<string,unknown>;return String(p.client_id??p.clientId??'')}catch{return ''}
}
async function token(key:string){
  const res=await postForm(auth()+'/token',{grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',client_id:clientIdFrom(key),assertion:key});
  return String(res.access_token);
}
export function fromZettle(p:Purchase):Entry|null{
  if(p.currency!=='GBP')return null;
  const id=p.purchaseUUID1||p.purchaseUUID;const when=p.timestamp||p.created;
  if(!id||!when)return null;
  return p.refund||p.amount<0
    ?{kind:'out',amount_pennies:Math.abs(p.amount),occurred_on:day(when),category:'Refunds',description:'Zettle refund',external_id:`zettle:${id}`}
    :{kind:'in',amount_pennies:p.amount,occurred_on:day(when),category:'Takings',description:'Zettle sale',external_id:`zettle:${id}`};
}

export const zettle:Provider={
  id:'zettle',name:'Zettle by PayPal',category:'payments',auth:'apikey',verified:false,
  blurb:'Card and till takings and refunds (Zettle does not share fees here).',
  keyLabel:'Zettle API key',
  keySteps:['Sign in at my.zettle.com.','Go to my.zettle.com/apps/api-keys and create a key.','Tick "Read purchases" (READ:PURCHASE), create it and copy the key.'],
  available:()=>true,
  async connectKey(key){
    if(!clientIdFrom(key.trim()))throw new Error('That does not look like a Zettle API key.');
    await token(key.trim());
    return {cred:{key:key.trim()},meta:{account:'Zettle account'}};
  },
  async sync({cred,since,now}){
    const access=await token(String(cred.key));
    const out:Entry[]=[];let hash='';
    for(let page=0;page<50;page++){
      const q=new URLSearchParams({startDate:since.toISOString(),endDate:now.toISOString(),limit:'1000'});
      if(hash)q.set('lastPurchaseHash',hash);
      const d=await getJson(`${api()}/purchases/v2?${q}`,{Authorization:`Bearer ${access}`}) as {purchases?:Purchase[];lastPurchaseHash?:string};
      const list=d.purchases??[];
      for(const p of list){const e=fromZettle(p);if(e)out.push(e)}
      if(!list.length||!d.lastPurchaseHash||d.lastPurchaseHash===hash)break;
      hash=d.lastPurchaseHash;
    }
    return out;
  },
};
