'use client';
import {useState} from 'react';
import {fillReply,replyLinks,shortTreatment,formatWhen,type ReplyKind} from '@/lib/reply';

export type BookingStatus='new'|'offered'|'confirmed'|'declined';
export type BookingRow={id:number;name:string;email:string|null;phone:string;treatment:string;location:string;preferences:string;notes:string|null;status:BookingStatus;client_name:string|null;created_at:string;short_notice?:boolean;appointment_at?:string|null};

const STATUS_LABEL:Record<BookingStatus,string>={new:'Needs a reply',offered:'Replied, waiting',confirmed:'Confirmed',declined:'Could not fit in'};
// datetime-local wants "YYYY-MM-DDTHH:MM" in the browser's own time (Emma's, in the UK).
const toLocalInput=(iso?:string|null)=>{if(!iso)return '';const d=new Date(iso);const p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};
const whenText=(iso:string)=>{const d=new Date(iso);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})};

// One booking request on Emma's desk. She picks a ready-written reply, edits it
// (the time is left for her to fill in), and sends it by WhatsApp, text or email.
// Sending marks the request, so the list keeps up without an extra tap.
export default function RequestCard({r,templates,business,onStatus,onBooked,reviewUrl,deposit=''}:{
  r:BookingRow;
  templates:{offer:string;decline:string;review:string;confirm:string};
  reviewUrl?:string;
  deposit?:string;
  business:string;
  onStatus:(id:number,status:BookingStatus)=>void;
  onBooked?:(row:BookingRow,note:string)=>void;
}){
  const [kind,setKind]=useState<ReplyKind>('offer');
  const template=(k:ReplyKind)=>k==='offer'?templates.offer:k==='decline'?templates.decline:templates.confirm;
  const [at,setAt]=useState(()=>toLocalInput(r.appointment_at));
  const [notify,setNotify]=useState(!!r.email);
  const [busy,setBusy]=useState(false);
  const [note,setNote]=useState('');
  const fill=(k:ReplyKind,when?:string|null)=>fillReply(template(k),r,business,'',{when:when?formatWhen(when):undefined,deposit});
  const [message,setMessage]=useState(()=>fill('offer'));
  const [open,setOpen]=useState(r.status==='new');
  const pick=(k:ReplyKind)=>{setKind(k);setMessage(fill(k,k==='confirm'?r.appointment_at:null))};
  const links=replyLinks(r,message,kind==='confirm'?`Booked: ${shortTreatment(r.treatment)}`:`Your request: ${shortTreatment(r.treatment)}`);
  const sent=()=>{if(kind!=='confirm')onStatus(r.id,kind==='offer'?'offered':'declined')};
  async function book(){
    if(!at){setNote('Pick the day and time first.');return}
    setBusy(true);setNote('');
    const res=await fetch('/api/admin/bookings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({id:r.id,appointmentAt:new Date(at).toISOString(),notify})});
    const out=await res.json().catch(()=>({}));
    setBusy(false);
    if(!res.ok){setNote(out.error||'Could not save that.');return}
    const msg=out.emailed==='sent'?'Booked. Confirmation emailed, and a reminder goes the day before.':out.emailed==='failed'?'Booked, but the email did not send. Send the message below instead.':'Booked. Send them the message below.';
    setNote(msg);setMessage(fill('confirm',out.request.appointment_at));
    onBooked?.({...r,...out.request,client_name:r.client_name},msg);
  }
  const review=reviewUrl?replyLinks(r,fillReply(templates.review,r,business,reviewUrl),'Thank you'):null;

  return <article className={r.status==='new'?'req is-new':'req'}>
    <div className="req-head"><b>{r.name}</b><span className={'status-tag status-'+r.status}>{STATUS_LABEL[r.status]}</span><span className="req-when">{whenText(r.created_at)}</span>{r.short_notice&&<span className="status-tag status-short">Short notice OK</span>}</div>
    <div className="req-body">
      <span><b>Treatment:</b> {r.treatment}</span>
      <span><b>Where:</b> {r.location}</span>
      <span><b>When suits:</b> {r.preferences}</span>
      {r.notes&&<span><b>Notes:</b> {r.notes}</span>}
      <span><b>Contact:</b> <a href={'tel:'+r.phone.replace(/\s/g,'')}>{r.phone}</a>{r.email?<> · <a href={'mailto:'+r.email}>{r.email}</a></>:null}</span>
      {r.client_name&&<span><b>On your client list as:</b> {r.client_name}</span>}
      {r.status==='confirmed'&&r.appointment_at&&<span className="req-booked"><b>Booked:</b> {formatWhen(r.appointment_at)}</span>}
    </div>
    {open?<div className="req-reply">
      <div className="req-kind" role="radiogroup" aria-label="Which reply">
        <button type="button" role="radio" aria-checked={kind==='offer'} className={kind==='offer'?'active':''} onClick={()=>pick('offer')}>Offer a time</button>
        <button type="button" role="radio" aria-checked={kind==='confirm'} className={kind==='confirm'?'active':''} onClick={()=>pick('confirm')}>Book them in</button>
        <button type="button" role="radio" aria-checked={kind==='decline'} className={kind==='decline'?'active':''} onClick={()=>pick('decline')}>Can&rsquo;t fit in</button>
      </div>
      {kind==='confirm'&&<div className="req-book">
        <label>Day and time<input type="datetime-local" value={at} onChange={e=>setAt(e.target.value)}/></label>
        {r.email&&<label className="toggle"><input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)}/> Email them the confirmation{deposit?' and deposit link':''}</label>}
        <button type="button" className="img-btn" disabled={busy} onClick={book}>{busy?'Saving…':'Confirm booking'}</button>
        {note&&<p className="req-hint">{note}</p>}
      </div>}
      <textarea rows={4} value={message} onChange={e=>setMessage(e.target.value)} aria-label="Your reply"/>
      {kind!=='decline'&&message.includes('[')&&<p className="req-hint">Fill in the part in [brackets] before sending.</p>}
      <div className="req-send">
        {links.whatsapp&&<a className="send-wa" href={links.whatsapp} target="_blank" rel="noopener" onClick={sent}>WhatsApp</a>}
        <a className="send-sms" href={links.sms} onClick={sent}>Text</a>
        {links.email&&<a className="send-email" href={links.email} onClick={sent}>Email</a>}
      </div>
    </div>:<button type="button" className="req-open" onClick={()=>setOpen(true)}>Reply again</button>}
    {r.status==='confirmed'&&review&&<div className="req-review"><span>After their visit, ask for a Google review:</span><div className="req-send">{review.whatsapp&&<a className="send-wa" href={review.whatsapp} target="_blank" rel="noopener">WhatsApp</a>}<a className="send-sms" href={review.sms}>Text</a>{review.email&&<a className="send-email" href={review.email}>Email</a>}</div></div>}
    <div className="req-actions">
      {r.status!=='confirmed'&&<button className="img-btn ghost" onClick={()=>onStatus(r.id,'confirmed')}>Confirmed elsewhere</button>}
      {r.status!=='offered'&&<button className="img-btn ghost" onClick={()=>onStatus(r.id,'offered')}>Replied, waiting</button>}
      {r.status!=='declined'&&<button className="img-btn ghost" onClick={()=>onStatus(r.id,'declined')}>Could not fit in</button>}
      {r.status!=='new'&&<button className="img-btn ghost" onClick={()=>onStatus(r.id,'new')}>Move back</button>}
    </div>
  </article>;
}
