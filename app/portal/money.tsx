'use client';
import {useEffect,useState} from 'react';
import type {MoneyEntry,MonthRow,MarginRow,FixedCost,Forecast} from '@/lib/money';
import {costKey} from '@/lib/money';
import {parseCsv,mapRows,type Mapping,type ImportRow} from '@/lib/csv';

type Conn={id:string;name:string;account?:string;lastSync?:string|null;lastError?:string|null};
type Data={connections:Conn[];months:MonthRow[];forecast:Forecast;margins:MarginRow[];costs:Record<string,number>;fixed:FixedCost[];recent:MoneyEntry[]};
const gbp=(p:number|null|undefined)=>p===null||p===undefined?'—':(p<0?'−':'')+'£'+(Math.abs(p)/100).toLocaleString('en-GB',{minimumFractionDigits:Math.abs(p)%100?2:0,maximumFractionDigits:2});
const monthName=(k:string)=>new Date(k+'-01T00:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
const toPounds=(p:number|undefined)=>p===undefined?'':String(p/100);
const OUT_CATS=['Stock & products','Rent & room hire','Insurance','Training','Marketing','Equipment','Card fees','Other'];

// Takings in, costs out, what is left each month, and what each treatment earns.
export default function MoneyView({go}:{go:(section:string)=>void}){
  const [d,setD]=useState<Data|null>(null);
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const [entry,setEntry]=useState({kind:'out',amount:'',date:new Date().toISOString().slice(0,10),category:'Stock & products',description:''});
  const [costs,setCosts]=useState<Record<string,string>>({});
  const [fixed,setFixed]=useState<{name:string;monthly:string}[]>([]);
  const [csv,setCsv]=useState<{name:string;rows:string[][]}|null>(null);
  const [map,setMap]=useState<Mapping>({date:0,amount:1,description:2,hasHeader:true,positiveIs:'in',category:''});
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
      <h2>Where the figures come from</h2>
      {d.connections.length?<>
        <ul className="money-conns">{d.connections.map(c=><li key={c.id}><b>{c.name}</b> <span>{c.account}{c.lastSync?` · updated ${new Date(c.lastSync).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:' · not updated yet'}</span>{c.lastError&&<em>{c.lastError}</em>}</li>)}</ul>
        <div className="money-actions"><button type="button" disabled={busy} onClick={async()=>{const o=await post({action:'sync'},'');if(o){const errs=(o.results as {name:string;error?:string}[]).filter(r=>r.error);setMsg(`Updated: ${o.added} new entr${o.added===1?'y':'ies'}.${errs.length?' '+errs.map(e=>`${e.name}: ${e.error}`).join(' '):''}`)}}}>Update all now</button><button type="button" className="img-btn ghost" onClick={()=>go('connections')}>Connections</button></div>
      </>:<>
        <p className="hint">Nothing connected yet. Connect your card machine (SumUp, Square, Stripe, Zettle) and your accounting software (Xero, QuickBooks, FreeAgent, Sage) so the figures come in on their own — or upload a spreadsheet below.</p>
        <div className="money-actions"><button type="button" onClick={()=>go('connections')}>Connect your systems</button></div>
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
      <h2>Upload a spreadsheet</h2>
      <p className="hint">From any till, booking system, bank or card machine: export a CSV, choose it here, and tell us which column is which. Uploading the same file twice does not double anything.</p>
      <input type="file" accept=".csv,text/csv" onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;const rows=parseCsv(await f.text());if(rows.length<1){setMsg('That file looks empty');return}
        const head=rows[0].map(h=>h.toLowerCase());const find=(re:RegExp)=>{const i=head.findIndex(h=>re.test(h));return i>=0?i:undefined};
        const amount=find(/amount|total|value|gross/),mi=find(/paid in|money in|credit/),mo=find(/paid out|money out|debit/);
        setMap({date:find(/date/)??0,amount:mi!==undefined&&mo!==undefined?undefined:amount??1,moneyIn:mi!==undefined&&mo!==undefined?mi:undefined,moneyOut:mi!==undefined&&mo!==undefined?mo:undefined,description:find(/desc|detail|memo|reference|name|note/),hasHeader:true,positiveIs:'in',category:''});
        setCsv({name:f.name,rows})}}/>
      {csv&&(()=>{const cols=csv.rows[0].map((h,i)=>({i,label:map.hasHeader?(h||`Column ${i+1}`):`Column ${i+1} (${h.slice(0,14)})`}));const pick=(k:keyof Mapping,label:string,optional=false)=><label>{label}<select value={map[k]===undefined?'':String(map[k])} onChange={e=>setMap(m=>({...m,[k]:e.target.value===''?undefined:Number(e.target.value)}))}>{optional&&<option value="">—</option>}{cols.map(c=><option key={c.i} value={c.i}>{c.label}</option>)}</select></label>;
        const res=mapRows(csv.rows,map);const two=map.amount===undefined;
        return <div className="csv-map">
          <p><b>{csv.name}</b> · {csv.rows.length-(map.hasHeader?1:0)} rows</p>
          <label className="toggle"><input type="checkbox" checked={map.hasHeader} onChange={e=>setMap(m=>({...m,hasHeader:e.target.checked}))}/> The first row is column names</label>
          <div className="admin-fields">
            {pick('date','Date')}
            <label>Amounts are in<select value={two?'two':'one'} onChange={e=>setMap(m=>e.target.value==='two'?{...m,amount:undefined,moneyIn:0,moneyOut:1}:{...m,amount:1,moneyIn:undefined,moneyOut:undefined})}><option value="one">One column (+ and −)</option><option value="two">Separate in and out columns</option></select></label>
            {two?<>{pick('moneyIn','Money in column',true)}{pick('moneyOut','Money out column',true)}</>:<>{pick('amount','Amount column')}<label>A positive amount is<select value={map.positiveIs} onChange={e=>setMap(m=>({...m,positiveIs:e.target.value as 'in'|'out'}))}><option value="in">Money in</option><option value="out">Money out</option></select></label></>}
            {pick('description','Description',true)}
            <label>Category (optional)<input value={map.category} placeholder="e.g. Cash takings" onChange={e=>setMap(m=>({...m,category:e.target.value}))}/></label>
          </div>
          <p className="hint">Ready: {res.ok.length} rows ({res.ok.filter(r=>r.kind==='in').length} in, {res.ok.filter(r=>r.kind==='out').length} out){res.skipped?` · ${res.skipped} rows without a date or amount will be skipped`:''}.</p>
          <ul className="csv-preview">{res.ok.slice(0,4).map((r:ImportRow,i)=><li key={i}>{r.occurred_on} · {r.kind==='in'?'+':'−'}{gbp(r.amount_pennies)} · {r.description??''}</li>)}</ul>
          <div className="money-actions"><button type="button" disabled={busy||!res.ok.length} onClick={async()=>{const o=await post({action:'import',rows:res.ok},'');if(o){setMsg(`Imported ${o.added} entr${o.added===1?'y':'ies'}${o.skipped?`, ${o.skipped} already there or not valid`:''}.`);setCsv(null)}}}>Import {res.ok.length} rows</button><button type="button" className="img-btn ghost" onClick={()=>setCsv(null)}>Cancel</button></div>
        </div>})()}
    </section>

    <section className="admin-card">
      <h2>For your accountant</h2>
      <p className="hint">Download every entry for the last 12 months as a spreadsheet (CSV). It opens in Excel and imports into most accounting software.</p>
      <div className="money-actions"><a className="conn-go" href="/api/admin/money/export">Download spreadsheet</a></div>
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
