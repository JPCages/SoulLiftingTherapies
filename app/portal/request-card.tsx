'use client';
import {useState} from 'react';
import {fillReply,replyLinks,shortTreatment,type ReplyKind} from '@/lib/reply';

export type BookingStatus='new'|'offered'|'confirmed'|'declined';
export type BookingRow={id:number;name:string;email:string|null;phone:string;treatment:string;location:string;preferences:string;notes:string|null;status:BookingStatus;client_name:string|null;created_at:string};

const STATUS_LABEL:Record<BookingStatus,string>={new:'Needs a reply',offered:'Replied, waiting',confirmed:'Confirmed',declined:'Could not fit in'};
const whenText=(iso:string)=>{const d=new Date(iso);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})};

// One booking request on Emma's desk. She picks a ready-written reply, edits it
// (the time is left for her to fill in), and sends it by WhatsApp, text or email.
// Sending marks the request, so the list keeps up without an extra tap.
export default function RequestCard({r,templates,business,onStatus}:{
  r:BookingRow;
  templates:{offer:string;decline:string};
  business:string;
  onStatus:(id:number,status:BookingStatus)=>void;
}){
  const [kind,setKind]=useState<ReplyKind>('offer');
  const [message,setMessage]=useState(()=>fillReply(templates.offer,r,business));
  const [open,setOpen]=useState(r.status==='new');
  const pick=(k:ReplyKind)=>{setKind(k);setMessage(fillReply(k==='offer'?templates.offer:templates.decline,r,business))};
  const links=replyLinks(r,message,`Your request: ${shortTreatment(r.treatment)}`);
  const sent=()=>onStatus(r.id,kind==='offer'?'offered':'declined');

  return <article className={r.status==='new'?'req is-new':'req'}>
    <div className="req-head"><b>{r.name}</b><span className={'status-tag status-'+r.status}>{STATUS_LABEL[r.status]}</span><span className="req-when">{whenText(r.created_at)}</span></div>
    <div className="req-body">
      <span><b>Treatment:</b> {r.treatment}</span>
      <span><b>Where:</b> {r.location}</span>
      <span><b>When suits:</b> {r.preferences}</span>
      {r.notes&&<span><b>Notes:</b> {r.notes}</span>}
      <span><b>Contact:</b> <a href={'tel:'+r.phone.replace(/\s/g,'')}>{r.phone}</a>{r.email?<> · <a href={'mailto:'+r.email}>{r.email}</a></>:null}</span>
      {r.client_name&&<span><b>On your client list as:</b> {r.client_name}</span>}
    </div>
    {open?<div className="req-reply">
      <div className="req-kind" role="radiogroup" aria-label="Which reply">
        <button type="button" role="radio" aria-checked={kind==='offer'} className={kind==='offer'?'active':''} onClick={()=>pick('offer')}>Offer a time</button>
        <button type="button" role="radio" aria-checked={kind==='decline'} className={kind==='decline'?'active':''} onClick={()=>pick('decline')}>Can&rsquo;t fit in</button>
      </div>
      <textarea rows={4} value={message} onChange={e=>setMessage(e.target.value)} aria-label="Your reply"/>
      {kind==='offer'&&message.includes('[')&&<p className="req-hint">Fill in the part in [brackets] before sending.</p>}
      <div className="req-send">
        {links.whatsapp&&<a className="send-wa" href={links.whatsapp} target="_blank" rel="noopener" onClick={sent}>WhatsApp</a>}
        <a className="send-sms" href={links.sms} onClick={sent}>Text</a>
        {links.email&&<a className="send-email" href={links.email} onClick={sent}>Email</a>}
      </div>
    </div>:<button type="button" className="req-open" onClick={()=>setOpen(true)}>Reply again</button>}
    <div className="req-actions">
      <button className="img-btn" onClick={()=>onStatus(r.id,'confirmed')}>Confirmed in Fresha</button>
      {r.status!=='offered'&&<button className="img-btn ghost" onClick={()=>onStatus(r.id,'offered')}>Replied, waiting</button>}
      {r.status!=='declined'&&<button className="img-btn ghost" onClick={()=>onStatus(r.id,'declined')}>Could not fit in</button>}
      {r.status!=='new'&&<button className="img-btn ghost" onClick={()=>onStatus(r.id,'new')}>Move back</button>}
    </div>
  </article>;
}
