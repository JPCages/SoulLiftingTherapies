'use client';
import {useEffect,useState} from 'react';

type Item={id:string;name:string;category:'payments'|'accounting';auth:'oauth'|'apikey';blurb:string;keyLabel?:string;keySteps?:string[];
  available:boolean;verified:boolean;connected:boolean;account?:string;lastSync?:string|null;lastResult?:string|null;lastError?:string|null;viaRailway?:boolean};
const GROUPS:[Item['category'],string,string][]=[
  ['payments','Card payments','Takings, refunds and fees come into Money on their own.'],
  ['accounting','Accounting','Your costs come into Money, so margins and cashflow are complete. Read only — nothing is ever changed in your books.'],
];
const when=(iso?:string|null)=>iso?new Date(iso).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';

// Connect the systems the business already uses. Payments by pasting a read-only
// key; accounting by signing in to the provider and approving access.
export default function Connections(){
  const [items,setItems]=useState<Item[]|null>(null);
  const [enabled,setEnabled]=useState(true);
  const [open,setOpen]=useState('');
  const [key,setKey]=useState('');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState('');
  const load=()=>fetch('/api/admin/connections').then(r=>r.json()).then(d=>{if(d.error){setMsg(d.error);return}setItems(d.items);setEnabled(d.enabled)}).catch(()=>setMsg('Could not load connections'));
  useEffect(()=>{
    const q=new URLSearchParams(location.search);
    load().then(()=>{
      if(q.get('connected'))setMsg('Connected. Press "Update now" to bring in the figures.');
      if(q.get('error'))setMsg(q.get('error')!);
    });
  },[]);
  const act=async(body:Record<string,string>,done:(d:Record<string,unknown>)=>string)=>{
    setBusy(body.provider||'all');setMsg('Working…');
    const r=await fetch('/api/admin/connections',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    setBusy('');setMsg(r.ok?done(d):(d.error||'That did not work'));
    if(r.ok){setOpen('');setKey('')}
    load();
  };
  if(!items)return <p className="muted">{msg||'Loading…'}</p>;
  return <div className="conns">
    {!enabled&&<p className="hint alert-off">Connections are not switched on for this site yet. JP needs to add one setting in Railway first.</p>}
    <p className="cust-msg" role="status">{msg}</p>
    {GROUPS.map(([cat,title,intro])=><section className="admin-card" key={cat}>
      <h2>{title}</h2><p className="hint">{intro}</p>
      <div className="conn-list">{items.filter(i=>i.category===cat).map(i=><article key={i.id} className={i.connected?'conn is-on':i.available?'conn':'conn is-off'}>
        <header><b>{i.name}</b>{i.connected?<span className="conn-tag on">Connected</span>:!i.available&&<span className="conn-tag">Not set up for this site yet</span>}</header>
        <p className="conn-blurb">{i.blurb}</p>
        {i.connected&&<p className="conn-meta">{i.account}{i.lastSync?` · updated ${when(i.lastSync)}`:' · not updated yet'}{i.lastResult?` (${i.lastResult})`:''}</p>}
        {i.lastError&&<p className="conn-err">{i.lastError}</p>}
        <div className="conn-actions">
          {i.connected?<>
            <button type="button" disabled={busy!==''} onClick={()=>act({action:'sync',provider:i.id},d=>`${i.name}: ${d.added} new entr${d.added===1?'y':'ies'}.`)}>{busy===i.id?'Updating…':'Update now'}</button>
            {!i.viaRailway&&<button type="button" className="ghost" disabled={busy!==''} onClick={()=>confirm(`Disconnect ${i.name}? Figures already brought in stay in Money.`)&&act({action:'disconnect',provider:i.id},()=>`${i.name} disconnected.`)}>Disconnect</button>}
          </>:i.available&&(i.auth==='oauth'
            ?<a className="conn-go" href={`/api/admin/connections/start?provider=${i.id}`}>Connect {i.name}</a>
            :<button type="button" onClick={()=>{setOpen(open===i.id?'':i.id);setKey('')}}>{open===i.id?'Cancel':`Connect ${i.name}`}</button>)}
        </div>
        {open===i.id&&i.auth==='apikey'&&<div className="conn-key">
          <ol className="money-steps">{i.keySteps?.map(s=><li key={s}>{s}</li>)}</ol>
          <label>{i.keyLabel}<input type="password" autoComplete="off" spellCheck={false} value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste the key here"/></label>
          <p className="hint">The key is locked (encrypted) as soon as it is saved and is never shown again — not even to you.</p>
          <button type="button" disabled={busy!==''||!key.trim()} onClick={()=>act({action:'key',provider:i.id,key},d=>{const f=d.first as {added?:number;error?:string}|undefined;return `${i.name} connected${f?.error?` — but the first update failed: ${f.error}`:` and ${f?.added??0} entries brought in.`}`})}>{busy===i.id?'Checking…':'Connect'}</button>
        </div>}
      </article>)}</div>
    </section>)}
    <section className="admin-card"><h2>Using something else?</h2><p className="hint">Any till, booking system or bank can export a spreadsheet (CSV). Upload it in <b>Money</b> and match the columns once — the figures go into the same place.</p></section>
  </div>;
}
