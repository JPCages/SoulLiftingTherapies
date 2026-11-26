import {isAdmin} from '@/lib/auth';
import {listMoneyEntries,addMoneyEntry,deleteMoneyEntry,getSetting,setSetting,readSiteContent} from '@/lib/db';
import {monthlyCashflow,forecast,treatmentMargins,type FixedCost} from '@/lib/money';
import {createHash} from 'node:crypto';
import {listConnections,syncAll} from '@/lib/connectors/service';

// Emma's Money tab. Private figures: admin only, kept out of the public content.
const COSTS_KEY='money_treatment_costs', FIXED_KEY='money_fixed_costs';
const parse=<T,>(raw:string|null,fallback:T):T=>{try{return raw?JSON.parse(raw) as T:fallback}catch{return fallback}};
const pence=(v:unknown)=>{const n=typeof v==='number'?v:parseFloat(String(v??'').replace(/[£,\s]/g,''));return Number.isFinite(n)&&n>=0&&n<1_000_000?Math.round(n*100):null};
const deny=()=>Response.json({error:'Admin sign-in required'},{status:401});

export async function GET(){
  if(!(await isAdmin()))return deny();
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const now=new Date();
  const since=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-11,1)).toISOString().slice(0,10);
  const [entries,costs,fixed,content,conns]=await Promise.all([
    listMoneyEntries(since),
    getSetting(COSTS_KEY).then(r=>parse<Record<string,number>>(r,{})),
    getSetting(FIXED_KEY).then(r=>parse<FixedCost[]>(r,[])),
    readSiteContent(),
    listConnections().catch(()=>({enabled:false,items:[]})),
  ]);
  const months=monthlyCashflow(entries,12,now);
  return Response.json({
    connections:conns.items.filter(c=>c.connected).map(c=>({id:c.id,name:c.name,account:c.account,lastSync:c.lastSync,lastError:c.lastError})),
    months,forecast:forecast(months,fixed),
    margins:treatmentMargins(content.categories,costs),
    costs,fixed,recent:entries.slice(0,60),
  });
}

export async function POST(request:Request){
  if(!(await isAdmin()))return deny();
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const b=await request.json().catch(()=>({})) as Record<string,unknown>;
  switch(b.action){
    case 'sync':{
      const results=await syncAll();
      return Response.json({ok:true,results,added:results.reduce((n,r)=>n+r.added,0)});
    }
    case 'import':{
      // Rows already matched to date / amount / description in the desk. Re-importing
      // the same spreadsheet adds nothing new: each row gets a fingerprint.
      const rows=Array.isArray(b.rows)?b.rows.slice(0,5000):[];
      const seen=new Map<string,number>();let added=0,skipped=0;
      for(const raw of rows){
        const r=raw as Record<string,unknown>;
        const kind=r.kind==='in'?'in':r.kind==='out'?'out':null;
        const amount=Number(r.amount_pennies);const date=String(r.occurred_on??'');
        if(!kind||!Number.isInteger(amount)||amount<=0||amount>100_000_000||!/^\d{4}-\d{2}-\d{2}$/.test(date)){skipped++;continue}
        const desc=r.description?String(r.description).slice(0,200):null;
        const category=String(r.category||(kind==='in'?'Takings':'Other')).slice(0,40);
        const base=`${date}|${kind}|${amount}|${desc??''}`;const n=(seen.get(base)??0)+1;seen.set(base,n);
        const id='csv:'+createHash('sha256').update(`${base}|${n}`).digest('hex').slice(0,32);
        if(await addMoneyEntry({kind,source:'import',amount_pennies:amount,occurred_on:date,category,description:desc,external_id:id}))added++;else skipped++;
      }
      return Response.json({ok:true,added,skipped});
    }
    case 'add':{
      const amount=pence(b.amount);
      const kind=b.kind==='in'?'in':b.kind==='out'?'out':null;
      const date=typeof b.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)?b.date:null;
      if(!kind||!amount||!date)return Response.json({error:'Add an amount and a date'},{status:400});
      const category=String(b.category||(kind==='in'?'Takings':'Other')).trim().slice(0,40)||'Other';
      await addMoneyEntry({kind,source:'manual',amount_pennies:amount,occurred_on:date,category,description:String(b.description??'').trim().slice(0,200)||null});
      return Response.json({ok:true});
    }
    case 'delete':{
      const id=Number(b.id);
      if(!Number.isInteger(id))return Response.json({error:'Choose an entry'},{status:400});
      return (await deleteMoneyEntry(id))?Response.json({ok:true}):Response.json({error:'Card payments from SumUp cannot be deleted here'},{status:400});
    }
    case 'costs':{
      const out:Record<string,number>={};
      for(const [k,v] of Object.entries((b.costs??{}) as Record<string,unknown>)){const p=pence(v);if(p!==null&&k.length<200)out[k]=p}
      await setSetting(COSTS_KEY,JSON.stringify(out));
      return Response.json({ok:true});
    }
    case 'fixed':{
      const list=(Array.isArray(b.fixed)?b.fixed:[]).slice(0,30).map(f=>{const x=f as Record<string,unknown>;return {name:String(x.name??'').trim().slice(0,60),monthly_pennies:pence(x.monthly)??0}}).filter(f=>f.name&&f.monthly_pennies>0);
      await setSetting(FIXED_KEY,JSON.stringify(list));
      return Response.json({ok:true});
    }
  }
  return Response.json({error:'Unknown action'},{status:400});
}
