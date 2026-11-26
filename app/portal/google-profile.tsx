'use client';
import {useState} from 'react';
import type {SiteContent} from '@/lib/site-content';

// Everything Emma's Google Business Profile should say, taken from her website so
// the two always match, with a copy button for each and plain steps. Matching
// details on the website and on Google help her show up in local searches.
const LIMIT=750;
function CopyRow({label,value,hint}:{label:string;value:string;hint?:string}){
  const [done,setDone]=useState(false);
  const missing=!value.trim();
  return <div className={missing?'g-row is-missing':'g-row'}>
    <div><b>{label}</b>{hint&&<small>{hint}</small>}<p>{missing?'Not filled in yet':value}</p></div>
    {!missing&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(value);setDone(true);setTimeout(()=>setDone(false),1500)}catch{}}}>{done?'Copied':'Copy'}</button>}
  </div>;
}

export default function GoogleProfile({content,onSavePatch}:{content:SiteContent;onSavePatch:(p:Partial<SiteContent>)=>Promise<boolean>}){
  const [desc,setDesc]=useState(content.googleDescription??content.seoDescription??content.heroIntro??'');
  const [review,setReview]=useState(content.googleReviewUrl??'');
  const [msg,setMsg]=useState('');
  const site=typeof window!=='undefined'?window.location.origin:'';
  const services=content.categories.map(c=>{const live=c.services.filter(s=>!s.hidden);return live.length?`${c.name}\n${live.map(s=>`• ${s.name} — ${s.price}, ${s.duration}`).join('\n')}`:''}).filter(Boolean).join('\n\n');
  const reviewOk=/^https:\/\/(g\.page|maps\.app\.goo\.gl|search\.google\.com|www\.google\.com|goo\.gl)\//.test(review.trim());
  const checks:[boolean,string][]=[
    [Boolean((content.horncastleHours||'').trim()&&(content.woodhallHours||'').trim()),'Opening hours are on your website for both places'],
    [desc.trim().length>0&&desc.length<=LIMIT,`Your description is written and under ${LIMIT} characters`],
    [reviewOk,'Your Google review link is saved here (used for asking for reviews)'],
  ];
  const save=async()=>{
    if(review.trim()&&!reviewOk){setMsg('That does not look like a Google review link. It usually starts with https://g.page/');return}
    setMsg('Saving…');
    const ok=await onSavePatch({googleDescription:desc.trim(),googleReviewUrl:review.trim()});
    setMsg(ok?'Saved.':'Could not save — please sign in again');
  };
  return <div className="gprofile">
    <section className="admin-card">
      <h2>Quick check</h2>
      <ul className="g-checks">{checks.map(([ok,t])=><li key={t} className={ok?'ok':''}><span aria-hidden="true">{ok?'✓':'○'}</span>{t}</li>)}</ul>
    </section>

    <section className="admin-card">
      <h2>How to update Google</h2>
      <ol className="money-steps">
        <li>On your phone or computer, sign in to the Google account that manages your business, then search Google for <b>my business</b>. Your profile appears at the top with buttons to edit it.</li>
        <li>Choose <b>Edit profile</b>. Copy each item below into the matching box on Google: name, phone, website, address, hours and description.</li>
        <li>Under <b>Products</b> or <b>Services</b>, add your treatments — the list below is ready to copy.</li>
        <li>Choose <b>Ask for reviews</b> (or <b>Get more reviews</b>), copy the link Google gives you, and paste it into the box at the bottom of this page.</li>
      </ol>
      <p className="hint">Google may check changes before they show. Keep the details here and on Google the same — if you change your phone or hours on the website, change them on Google too.</p>
    </section>

    <section className="admin-card">
      <h2>Copy these into Google</h2>
      <CopyRow label="Business name" value={content.businessName} hint="Exactly as customers know you — Google asks for no extra words."/>
      <CopyRow label="Phone" value={content.phone}/>
      <CopyRow label="Website" value={site}/>
      <CopyRow label="Horncastle address" value={content.horncastle}/>
      <CopyRow label="Horncastle hours" value={content.horncastleHours??''}/>
      <CopyRow label="Woodhall Spa address" value={content.woodhall}/>
      <CopyRow label="Woodhall Spa hours" value={content.woodhallHours??''}/>
      <div className="g-row g-desc"><div><b>Description</b><small>What you do, where, and who for — in your own words. {desc.length}/{LIMIT} characters.</small>
        <textarea rows={5} value={desc} maxLength={LIMIT} onChange={e=>setDesc(e.target.value)}/></div>
        <button type="button" onClick={()=>navigator.clipboard?.writeText(desc)}>Copy</button></div>
      <CopyRow label="Treatments and prices" value={services} hint="Add these under Services on Google."/>
    </section>

    <section className="admin-card admin-fields">
      <h2 className="wide">Your Google review link</h2>
      <label className="wide">Review link from Google<input value={review} placeholder="https://g.page/r/…/review" onChange={e=>setReview(e.target.value)}/></label>
      <p className="hint wide">Once this is saved, confirmed booking requests get an <b>Ask for a review</b> message you can send by WhatsApp or text after their visit.</p>
      <div className="wide money-actions"><button type="button" onClick={save}>Save</button><span className="cust-msg">{msg}</span></div>
    </section>
  </div>;
}
