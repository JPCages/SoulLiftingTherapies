'use client';
import {useEffect,useState} from 'react';
import type {SiteContent} from '@/lib/site-content';
import {PRIVACY_QUESTIONS,SIGN_OFFS,emptyAnswers,checklistStatus,type ChecklistAnswers} from '@/lib/checklist';

function Badge({ok}:{ok:boolean}){
  return <span className={ok?'todo-badge is-done':'todo-badge'}>{ok?'Done':'To do'}</span>;
}

// Emma's launch to-do list. Things that are part of the website (opening hours,
// card photos) are filled in where they live, so the answer IS the change.
// Things JP needs (privacy answers, sign-offs) are saved privately for him.
export default function TodoList({content,onSavePatch,go}:{
  content:SiteContent;
  onSavePatch:(patch:Partial<SiteContent>)=>Promise<boolean>;
  go:(section:string,anchor?:string)=>void;
}){
  const [answers,setAnswers]=useState<ChecklistAnswers>(emptyAnswers());
  const [loaded,setLoaded]=useState(false);
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const [hours,setHours]=useState({h:content.horncastleHours??'',w:content.woodhallHours??''});

  useEffect(()=>{
    fetch('/api/admin/checklist').then(r=>r.ok?r.json():null).then(d=>{if(d?.answers)setAnswers(d.answers)}).catch(()=>{}).finally(()=>setLoaded(true));
  },[]);

  const items=checklistStatus({...content,horncastleHours:hours.h,woodhallHours:hours.w},answers);
  const done=items.filter(i=>i.done).length;
  const byId=Object.fromEntries(items.map(i=>[i.id,i]));

  async function saveAnswers(next=answers){
    setBusy(true);setMsg('Saving…');
    const r=await fetch('/api/admin/checklist',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(next)});
    const d=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setMsg(d.error||'Could not save — please sign in again');return}
    setAnswers(d.answers);setMsg('Saved. JP can see your answers.');
  }
  async function saveHours(){
    setBusy(true);setMsg('Saving…');
    const ok=await onSavePatch({horncastleHours:hours.h.trim(),woodhallHours:hours.w.trim()});
    setBusy(false);setMsg(ok?'Opening hours saved — they now show on the homepage.':'Could not save — please sign in again');
  }

  const cats=content.categories.filter(c=>c.services.length);

  return <div className="todo">
    <div className="admin-card todo-intro">
      <p className="todo-progress"><b>{done} of {items.length}</b> done</p>
      <div className="todo-bar"><span style={{width:`${Math.round(done/items.length*100)}%`}}/></div>
      <p className="hint">These are the last things needed before the website is promoted. Fill in what you can — every answer is saved, and you can come back any time. {msg&&<b className="todo-msg">{msg}</b>}</p>
    </div>

    <section className="admin-card todo-item">
      <header><h2>1. Opening hours</h2><Badge ok={byId.hours.done}/></header>
      <p className="hint">Shown under each address on the homepage. Write them how you would say them, e.g. “Tuesday and Thursday, 9am–5pm”.</p>
      <div className="admin-fields">
        <label className="wide">Horncastle<input value={hours.h} onChange={e=>setHours(v=>({...v,h:e.target.value}))}/></label>
        <label className="wide">Woodhall Spa<input value={hours.w} onChange={e=>setHours(v=>({...v,w:e.target.value}))}/></label>
      </div>
      <div className="todo-actions"><button type="button" disabled={busy} onClick={saveHours}>Save opening hours</button></div>
    </section>

    <section className="admin-card todo-item">
      <header><h2>2. A homepage photo for each treatment type</h2><Badge ok={byId.cards.done}/></header>
      <p className="hint">Each treatment type has a tall photo on the homepage. Please use a real photo of the treatment — not an advert, a logo, or a picture with writing on it, as those get cut off on phones.</p>
      <ul className="todo-list">{cats.map(c=>{
        const ci=content.categories.indexOf(c);
        const ok=!!(c.cardImage||c.image);
        return <li key={c.name}><span>{c.name}</span><span className={ok?'todo-ok':'todo-miss'}>{ok?'Has a photo':'Needs a photo'}</span><button type="button" className="todo-link" onClick={()=>go('services',`card-${ci}`)}>{ok?'Change':'Choose photo'}</button></li>;
      })}</ul>
    </section>

    <section className="admin-card todo-item">
      <header><h2>3. Photos for individual treatments</h2><Badge ok={byId.photos.done}/></header>
      <p className="hint">{byId.photos.detail} Add these in Treatments, under each treatment.</p>
      <div className="todo-actions"><button type="button" className="ghost" onClick={()=>go('services')}>Go to Treatments</button></div>
    </section>

    <section className="admin-card todo-item">
      <header><h2>4. Five questions for your privacy policy</h2><Badge ok={byId.privacy.done}/></header>
      <p className="hint">The website takes customers’ names and emails, so it legally needs a privacy policy and terms. JP will write them — he just needs these answers in your words.</p>
      {PRIVACY_QUESTIONS.map(q=><label className="todo-q" key={q.id}>
        <b>{q.label}</b><span className="hint">{q.hint}</span>
        <textarea rows={3} value={answers.privacy[q.id]??''} disabled={!loaded} onChange={e=>setAnswers(a=>({...a,privacy:{...a.privacy,[q.id]:e.target.value}}))}/>
      </label>)}
      <div className="todo-actions"><button type="button" disabled={busy||!loaded} onClick={()=>saveAnswers()}>Save my answers</button></div>
    </section>

    <section className="admin-card todo-item">
      <header><h2>5. Sign-offs</h2><Badge ok={byId.signoffs.done}/></header>
      <p className="hint">Tick each one once you are happy. If something needs changing, say what in the box below instead of ticking it.</p>
      <div className="todo-checks">{SIGN_OFFS.map(o=><label key={o.id} className="todo-check">
        <input type="checkbox" checked={!!answers.signOffs[o.id]} disabled={!loaded} onChange={e=>setAnswers(a=>({...a,signOffs:{...a.signOffs,[o.id]:e.target.checked}}))}/>
        <span>{o.label}</span>
      </label>)}</div>
      <label className="todo-q"><b>Anything to change or tell JP?</b>
        <textarea rows={3} value={answers.notes} disabled={!loaded} onChange={e=>setAnswers(a=>({...a,notes:e.target.value}))}/>
      </label>
      <div className="todo-actions"><button type="button" disabled={busy||!loaded} onClick={()=>saveAnswers()}>Save my answers</button></div>
    </section>
  </div>;
}
