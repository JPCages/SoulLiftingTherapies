'use client';

import { useEffect, useState } from 'react';
import { defaultSiteContent, type SiteContent } from '@/lib/site-content';
import type { Service } from '@/lib/sandbox-data';
import Image from 'next/image';

// Fallback photos by category name (used only when no photo has been uploaded).
const images:Record<string,string>={Massage:'/images/room-forest.jpeg','Facials & advanced skin':'/images/lymphflo.png','Lycon waxing':'/images/wax-underarm.jpg','Eyes & lashes':'/images/emma.jpeg',Cryotherapy:'/images/room-shelf.jpeg','Holistic treatments':'/images/room-forest.jpeg'};

export default function Services(){
  const [content,setContent]=useState<SiteContent>(defaultSiteContent);
  const [active,setActive]=useState(defaultSiteContent.categories[0].name);
  const [selected,setSelected]=useState<Service|null>(null);
  useEffect(()=>{fetch('/api/content').then(r=>r.ok?r.json():null).then(x=>x&&setContent(x)).catch(()=>{})},[]);
  useEffect(()=>{ if(!content.categories.some(c=>c.name===active)&&content.categories[0]) setActive(content.categories[0].name); },[content,active]);
  const category=content.categories.find(c=>c.name===active)??content.categories[0];
  if(!category) return null;
  const photoFor=(s:Service)=>s.image||category.image||images[category.name]||'/images/room-forest.jpeg';
  const posFor=(s:Service)=>`center ${s.imagePos??category.imagePos??50}%`;
  return <main className="treatments-app">
    <header className="app-topbar"><a className="mini-brand" href="/" aria-label="Soul Lifting Therapies home"><span className="lotus-mark"><Image src="/brand/mark-lotus.webp" alt="" width={64} height={64}/></span><span>SOUL LIFTING<br/>THERAPIES</span></a><h1>{content.servicesTitle||'Treatments'}</h1><a className="basket" href="/book" aria-label="Bookings">⌑</a></header>
    <nav className="treatment-tabs" aria-label="Treatment categories">{content.categories.map(c=><button key={c.name} className={active===c.name?'active':''} onClick={()=>setActive(c.name)}>{c.name}</button>)}</nav>
    <section className="catalogue-list" aria-live="polite">
      <div className={category.banner?'catalogue-intro has-banner':'catalogue-intro'} style={category.banner?{backgroundImage:`linear-gradient(to bottom,rgba(4,32,34,.1) 0%,rgba(4,32,34,.22) 45%,rgba(4,32,34,.72) 100%),url('${category.banner}')`,backgroundPosition:`center ${category.bannerPos??50}%`}:undefined}><h2>{category.name}</h2><p>{category.short}</p></div>
      {category.services.map((service)=><button className="luxury-treatment-card" onClick={()=>setSelected(service)} key={service.name}>
        <span className="treatment-photo" style={{backgroundImage:`url('${photoFor(service)}')`,backgroundPosition:posFor(service)}}/>
        <span className="treatment-copy"><strong>{service.name}</strong>{service.description&&<span className="card-desc">{service.description}</span>}<span className="duration"><i>◷</i> {service.duration}</span><span className="price">{service.price}</span></span><span className="chevron">›</span>
      </button>)}
    </section>
    <aside className="catalogue-help"><p>{content.servicesHelpHeading||'Not sure which treatment is right for you?'}</p><a href={`https://wa.me/44${content.phone.replace(/\D/g,'').replace(/^0/,'')}`}>{content.servicesHelpCta||'Ask Emma'}</a></aside>

    {selected&&<div className="treatment-detail" role="dialog" aria-modal="true" onClick={()=>setSelected(null)}>
      <div className="detail-sheet" onClick={e=>e.stopPropagation()}>
        <button className="detail-close" aria-label="Close" onClick={()=>setSelected(null)}>×</button>
        <div className="detail-photo" style={{backgroundImage:`url('${photoFor(selected)}')`,backgroundPosition:posFor(selected)}}/>
        <div className="detail-body">
          <p className="detail-cat">{category.name}</p>
          <h2>{selected.name}</h2>
          <div className="detail-meta"><span><i>◷</i> {selected.duration}</span><span className="price">{selected.price}</span></div>
          {selected.description&&<p className="detail-desc">{selected.description}</p>}
          {selected.note&&<p className="detail-note"><b>Please note:</b> {selected.note}</p>}
          <a className="primary" href="/book">Book this treatment</a>
        </div>
      </div>
    </div>}

    <nav className="app-bottom-nav" aria-label="Main navigation"><a href="/"><span>⌂</span>Home</a><a className="active" href="/services"><span>▣</span>Treatments</a><a href="/account"><span>✿</span>Rewards</a><a href="/book"><span>▤</span>Bookings</a><a href="/account"><span>♙</span>Profile</a></nav>
  </main>;
}
