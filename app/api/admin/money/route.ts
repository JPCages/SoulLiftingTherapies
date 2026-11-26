import {isAdmin} from '@/lib/auth';
import {listMoneyEntries,addMoneyEntry,deleteMoneyEntry,getSetting,setSetting,readSiteContent} from '@/lib/db';
import {monthlyCashflow,forecast,treatmentMargins,type FixedCost} from '@/lib/money';
import {sumupConfigured,syncSumUp,SUMUP_SYNC_KEY} from '@/lib/sumup';

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
  const [entries,costs,fixed,content,lastSync]=await Promise.all([
    listMoneyEntries(since),
    getSetting(COSTS_KEY).then(r=>parse<Record<string,number>>(r,{})),
    getSetting(FIXED_KEY).then(r=>parse<FixedCost[]>(r,[])),
    readSiteContent(),
    getSetting(SUMUP_SYNC_KEY),
  ]);
  const months=monthlyCashflow(entries,12,now);
  return Response.json({
    sumup:{connected:sumupConfigured(),lastSync},
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
      try{return Response.json({ok:true,...await syncSumUp()})}
      catch(e){return Response.json({error:e instanceof Error?e.message:'Could not reach SumUp'},{status:502})}
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
