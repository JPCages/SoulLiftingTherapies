'use client';
import {useEffect,useRef,useState} from 'react';
import {defaultSiteContent,type SiteContent} from '@/lib/site-content';

export default function Account(){
  const [content,setContent]=useState<SiteContent>(defaultSiteContent);
  const input=useRef<HTMLInputElement>(null);
  const [photos,setPhotos]=useState<string[]>([]);
  useEffect(()=>{fetch('/api/content').then(r=>r.ok?r.json():null).then(x=>x&&setContent(x)).catch(()=>{})},[]);
  const addPhotos=(files:FileList|null)=>{
    if(!files)return;
    Array.from(files).forEach(file=>{
      const reader=new FileReader();
      reader.onload=()=>setPhotos(p=>[...p,reader.result as string]);
      reader.readAsDataURL(file);
    });
  };
  const heroBg=`linear-gradient(90deg,rgba(249,244,233,.92),rgba(249,244,233,.55)),url('${content.accountHeroImage||defaultSiteContent.accountHeroImage}')`;
  const feelings=content.feelings&&content.feelings.length?content.feelings:defaultSiteContent.feelings!;
  return <main className="account"><header className="apphead"><span>⌂</span><b>Soul Lifting<br/>Therapies</b><span>♧</span></header><section className="account-hero" style={{backgroundImage:heroBg}}><p>{content.accountGreeting}</p><h1>{content.accountName}</h1><p className="subtle">{content.accountSubtitle}</p></section><section className="feeling"><h2>{content.feelingHeading}</h2><div className="feeling-grid">{feelings.map((f,i)=><button key={i}>{f.icon}<span>{f.label}</span></button>)}</div></section><section className="account-grid"><article className="appointment"><p className="label">{content.appointmentLabel}</p><b>{content.appointmentHeading}</b><h3>{content.appointmentEmpty}</h3><p>{content.appointmentHint}</p><a href="/book">{content.appointmentCta}</a></article><article className="score"><p className="label">{content.wellbeingLabel}</p><strong>—</strong><span>{content.wellbeingHint}</span></article></section><section className="points"><div><p className="label">{content.pointsLabel}</p><strong>0 <small>points</small></strong><p>{content.pointsIntro}</p></div><span>✦</span></section><section className="journey"><h2>{content.journeyHeading}</h2><p>{content.journeyIntro}</p>
    {photos.length>0&&<div className="journey-photos">{photos.map((src,i)=><div key={i} className="journey-photo"><img src={src} alt={`Progress photo ${i+1}`}/><button aria-label="Remove photo" onClick={()=>setPhotos(p=>p.filter((_,j)=>j!==i))}>×</button></div>)}</div>}
    <input ref={input} type="file" accept="image/*" multiple hidden onChange={e=>{addPhotos(e.target.files);e.target.value=''}}/>
    <button className="photo-add" onClick={()=>input.current?.click()}>＋ Add a private progress photo</button>
    {photos.length>0&&<p className="journey-note">These photos stay on this device only. Saving them to your account will be available once customer accounts go live.</p>}
  </section><nav className="bottomnav"><a href="/account">⌂<span>Home</span></a><a href="/services">♧<span>Treatments</span></a><a href="/account">✦<span>Rewards</span></a><a href="/book">▣<span>Bookings</span></a><a href="/login">♙<span>Profile</span></a></nav></main>;
}
