'use client';
import {useEffect,useState} from 'react';
import type {MoneyEntry,MonthRow,MarginRow,FixedCost,Forecast} from '@/lib/money';
import {costKey} from '@/lib/money';

type Data={sumup:{connected:boolean;lastSync:string|null};months:MonthRow[];forecast:Forecast;margins:MarginRow[];costs:Record<string,number>;fixed:FixedCost[];recent:MoneyEntry[]};
const gbp=(p:number|null|undefined)=>p===null||p===undefined?'—':(p<0?'−':'')+'£'+(Math.abs(p)/100).toLocaleString('en-GB',{minimumFractionDigits:Math.abs(p)%100?2:0,maximumFractionDigits:2});
const monthName=(k:string)=>new Date(k+'-01T00:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
const toPounds=(p:number|undefined)=>p===undefined?'':String(p/100);
const OUT_CATS=['Stock & products','Rent & room hire','Insurance','Training','Marketing','Equipment','Card fees','Other'];

// Takings in, costs out, what is left each month, and what each treatment earns.
export default function MoneyView(){
  const [d,setD]=useState<Data|null>(null);
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const [entry,setEntry]=useState({kind:'out',amount:'',date:new Date().toISOString().slice(0,10),category:'Stock & products',description:''});
  const [costs,setCosts]=useState<Record<string,string>>({});
  const [fixed,setFixed]=useState<{name:string;monthly:string}[]>([]);
  const load=()=>fetch('/api/admin/money').then(r=>r.json()).then((x:Data&{error?:string})=>{
    if(x.error){setMsg(x.error);return}
    setD(x);
    setCosts(Object.fromEntries(Object.entries(x.costs).map(([k,v])=>[k,toPounds(v)])));
    setFixed(x.fixed.map(f=>({name:f.name,monthly:toPounds(f.monthly_pennies)})));
  }).catch(()=>setMsg('Could not load your figures'));
  useEffect(()=>{load()},[]);
  const post=async(body:Record<string,unknown>,done:string)=>{
    setBusy(true);setMsg('Working…');
    const r=await fetch('/api/admin/money',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const o=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setMsg(o.error||'That did not work');return false}
    setMsg(typeof done==='string'?done:'Saved.');await load();return o;
  };
  if(!d)return <p className="muted">{msg||'Loading…'}</p>;
  const thisMonth=d.months.at(-1)!, lastMonth=d.months.at(-2)!;
  const maxIn=Math.max(1,...d.months.map(m=>m.takings));
  return <div className="money">
    <p className="cust-msg" role="status">{msg}</p>

    <section className="admin-card money-connect">
      <h2>Card takings from SumUp</h2>
      {d.sumup.connected?<>
        <p className="hint">Connected. {d.sumup.lastSync?`Last updated ${new Date(d.sumup.lastSync).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}.`:'Not updated yet — press the button to bring in the last year.'} Card fees come in with SumUp&rsquo;s payouts to your bank.</p>
        <button type="button" disabled={busy} onClick={async()=>{const o=await post({action:'sync'},'');if(o)setMsg(`Updated from SumUp: ${o.added} new payment${o.added===1?'':'s'} or refund${o.added===1?'':'s'}, ${o.fees} fee${o.fees===1?'':'s'}.`)}}>Update from SumUp</button>
      </>:<>
        <p className="hint">Not connected yet. To connect, create a key in SumUp and give it to JP to add securely — please don&rsquo;t email it or type it here.</p>
        <ol className="money-steps"><li>Sign in at me.sumup.com.</li><li>Open your profile, then <b>Settings</b> → <b>For Developers</b> → <b>Toolkit</b> → <b>API Keys</b>.</li><li>Press <b>Create</b>, call it &ldquo;Website&rdquo;, and copy the key (SumUp only shows it once).</li><li>Give it to JP by phone or in person. Until then you can add takings yourself below.</li></ol>
      </>}
    </section>

    <div className="money-stats">
      <div className="admin-stat"><span>Takings this month</span><strong>{gbp(thisMonth.takings)}</strong></div>
      <div className="admin-stat"><span>Fees and costs this month</span><strong>{gbp(thisMonth.fees+thisMonth.costs)}</strong></div>
      <div className="admin-stat"><span>Left this month</span><strong className={thisMonth.net<0?'neg':''}>{gbp(thisMonth.net)}</strong></div>
      <div className="admin-stat"><span>Last month, left</span><strong className={lastMonth.net<0?'neg':''}>{gbp(lastMonth.net)}</strong></div>
    </div>

    <section className="admin-card">
      <h2>Month by month</h2>
      <div className="money-table" role="table" aria-label="Month by month">
        <div className="mt-row mt-head" role="row"><span>Month</span><span>Takings</span><span>Fees</span><span>Costs</span><span>Left</span></div>
        {[...d.months].reverse().map(m=><div className="mt-row" role="row" key={m.month}><span>{monthName(m.month)}</span><span className="mt-bar"><i style={{width:`${Math.round(m.takings/maxIn*100)}%`}}/>{gbp(m.takings)}</span><span>{gbp(m.fees)}</span><span>{gbp(m.costs)}</span><span className={m.net<0?'neg':''}>{gbp(m.net)}</span></div>)}
      </div>
      <p className="hint">{d.forecast.basis?<>Next month, if it is like the last {d.forecast.basis===1?'month':`${d.forecast.basis} months`}: about <b>{gbp(d.forecast.avgTakings)}</b> in after card fees, less <b>{gbp(d.forecast.fixed)}</b> regular costs = <b>{gbp(d.forecast.expectedNet)}</b> left. This is an estimate, not a promise.</>:'Once there is a full month of takings, an estimate for next month appears here.'}</p>
    </section>

    <section className="admin-card admin-fields">
      <h2 className="wide">Add money in or out</h2>
      <p className="hint wide">For cash payments, stock, rent and anything SumUp doesn&rsquo;t know about.</p>
      <label>Type<select value={entry.kind} onChange={e=>setEntry(x=>({...x,kind:e.target.value,category:e.target.value==='in'?'Cash takings':'Stock & products'}))}><option value="in">Money in</option><option value="out">Money out</option></select></label>
      <label>Amount (£)<input inputMode="decimal" value={entry.amount} onChange={e=>setEntry(x=>({...x,amount:e.target.value}))} placeholder="0.00"/></label>
      <label>Date<input type="date" value={entry.date} onChange={e=>setEntry(x=>({...x,date:e.target.value}))}/></label>
      <label>Category{entry.kind==='in'?<input value={entry.category} onChange={e=>setEntry(x=>({...x,category:e.target.value}))}/>:<select value={entry.category} onChange={e=>setEntry(x=>({...x,category:e.target.value}))}>{OUT_CATS.map(c=><option key={c}>{c}</option>)}</select>}</label>
      <label className="wide">Note (optional)<input value={entry.description} onChange={e=>setEntry(x=>({...x,description:e.target.value}))}/></label>
      <div className="wide"><button type="button" disabled={busy} onClick={async()=>{if(await post({action:'add',...entry},'Added.'))setEntry(x=>({...x,amount:'',description:''}))}}>Add</button></div>
    </section>

    <section className="admin-card">
      <h2>Regular monthly costs</h2>
      <p className="hint">Rent, insurance, subscriptions. Used for the estimate above.</p>
      <div className="fixed-list">{fixed.map((f,i)=><div className="fixed-row" key={i}><input aria-label="What it is" value={f.name} placeholder="e.g. Room hire" onChange={e=>setFixed(l=>l.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/><span>£</span><input aria-label="Per month" inputMode="decimal" value={f.monthly} placeholder="0" onChange={e=>setFixed(l=>l.map((x,j)=>j===i?{...x,monthly:e.target.value}:x))}/><button type="button" className="danger" onClick={()=>setFixed(l=>l.filter((_,j)=>j!==i))}>Remove</button></div>)}</div>
      <div className="money-actions"><button type="button" className="img-btn ghost" onClick={()=>setFixed(l=>[...l,{name:'',monthly:''}])}>＋ Add a cost</button><button type="button" disabled={busy} onClick={()=>post({action:'fixed',fixed},'Regular costs saved.')}>Save regular costs</button></div>
    </section>

    <section className="admin-card">
      <h2>What each treatment earns</h2>
      <p className="hint">Enter what the products for one treatment cost you. The margin is the price less that cost; &ldquo;per hour&rdquo; is what an hour of that treatment brings in after products.</p>
      <div className="margin-table">
        <div className="mg-row mg-head"><span>Treatment</span><span>Price</span><span>Product cost (£)</span><span>Margin</span><span>Per hour</span></div>
        {d.margins.map(m=>{const k=costKey(m.category,m.name);return <div className="mg-row" key={k}><span>{m.name}<small>{m.category}</small></span><span>{gbp(m.price)}</span><span><input aria-label={`Product cost for ${m.name}`} inputMode="decimal" value={costs[k]??''} placeholder="0" onChange={e=>setCosts(c=>({...c,[k]:e.target.value}))}/></span><span>{m.margin===null?'—':`${gbp(m.margin)} (${m.marginPct}%)`}</span><span>{gbp(m.perHour)}</span></div>})}
      </div>
      <div className="money-actions"><button type="button" disabled={busy} onClick={()=>post({action:'costs',costs:Object.fromEntries(Object.entries(costs).filter(([,v])=>v.trim()!==''))},'Costs saved — margins updated.')}>Save costs</button></div>
    </section>

    <section className="admin-card">
      <h2>Recent entries</h2>
      {d.recent.length===0?<p className="muted">Nothing yet.</p>:<ul className="money-recent">{d.recent.map(e=><li key={e.id}><span><b>{e.kind==='in'?'+':'−'}{gbp(e.amount_pennies)}</b> {e.category}{e.description?` · ${e.description}`:''}<small>{new Date(e.occurred_on+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})} · {e.source==='sumup'?'SumUp':'Added by you'}</small></span>{e.source!=='sumup'&&<button type="button" className="img-btn ghost" onClick={()=>confirm('Delete this entry?')&&post({action:'delete',id:e.id},'Deleted.')}>Delete</button>}</li>)}</ul>}
    </section>
  </div>;
}
