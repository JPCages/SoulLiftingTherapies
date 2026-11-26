'use client';
import {useEffect,useState} from 'react';

type Version={id:number;summary:string;saved_at:string};
const when=(iso:string)=>new Date(iso).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

// The last ten publishes. Undoing one puts the site back as it was just before
// that change; the version it replaces is kept too, so nothing is ever lost.
export default function UndoPanel({refreshKey,onRestored}:{refreshKey:string;onRestored:()=>void}){
  const [versions,setVersions]=useState<Version[]|null>(null);
  const [open,setOpen]=useState(false);
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let live=true;
    fetch('/api/admin/history').then(r=>r.json()).then(d=>{if(live)setVersions(d.versions||[])}).catch(()=>{});
    return ()=>{live=false};
  },[refreshKey]);
  if(!versions||versions.length===0)return null;
  const undo=async(v:Version)=>{
    if(!confirm(`Put the site back to how it was before “${v.summary.replace(/^Changed /,'')}” (${when(v.saved_at)})?`))return;
    setBusy(true);setMsg('Putting it back…');
    const r=await fetch('/api/admin/history',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:v.id})});
    const d=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setMsg(d.error||'Could not undo');return}
    setMsg('Done — the site is back as it was.');
    onRestored();
  };
  const [latest,...rest]=versions;
  return <div className="admin-card undo">
    <div className="undo-row">
      <div><b>Last change</b><span>{latest.summary} · {when(latest.saved_at)}</span></div>
      <button type="button" disabled={busy} onClick={()=>undo(latest)}>Undo last change</button>
    </div>
    {rest.length>0&&<button type="button" className="undo-more" onClick={()=>setOpen(o=>!o)}>{open?'Hide earlier changes':`Earlier changes (${rest.length})`}</button>}
    {open&&<ul className="undo-list">{rest.map(v=><li key={v.id}><span>{v.summary}<small>{when(v.saved_at)}</small></span><button type="button" disabled={busy} onClick={()=>undo(v)}>Go back to before this</button></li>)}</ul>}
    {msg&&<p className="cust-msg">{msg}</p>}
  </div>;
}
