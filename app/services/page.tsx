'use client';

import { useEffect, useState } from 'react';
import { defaultSiteContent, type SiteContent } from '@/lib/site-content';
import type { Service } from '@/lib/sandbox-data';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';
import PageHero from '../page-hero';

// Fallback photos by category name (used only when no photo has been uploaded).
const images:Record<string,string>={Massage:'/images/room-forest.jpeg','Facials & advanced skin':'/images/lymphflo.png','Lycon waxing':'/images/wax-underarm.jpg','Eyes & lashes':'/images/emma.jpeg',Cryotherapy:'/images/room-shelf.jpeg','Holistic treatments':'/images/room-forest.jpeg'};

export default function Services(){
  const [content,setContent]=useState<SiteContent>(defaultSiteContent);
  const [active,setActive]=useState(defaultSiteContent.categories[0].name);
  const [selected,setSelected]=useState<Service|null>(null);
  useEffect(()=>{fetch('/api/content').then(r=>r.ok?r.json():null).then(x=>x&&setContent(x)).catch(()=>{})},[]);
  const category=content.categories.find(c=>c.name===active)??content.categories[0];
  if(!category) return null;
  const photoFor=(s:Service)=>s.image||category.image||images[category.name]||'/images/room-forest.jpeg';
  const posFor=(s:Service)=>`center ${s.imagePos??category.imagePos??50}%`;
  return <main className="treatments-app site-lux"><SiteHeader content={content} overlay/>
    <PageHero image={content.servicesHeroImage} label={content.homeMenuEyebrow||'Treatment menu'} title={content.servicesTitle||'Treatments'} alt={`${content.businessName} treatment`}/>
    <nav className="treatment-tabs" aria-label="Treatment categories">{content.categories.map(c=><button key={c.name} className={category.name===c.name?'active':''} onClick={()=>setActive(c.name)}>{c.name}</button>)}</nav>
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
          <a className="primary" href={`/book?treatment=${encodeURIComponent(selected.name)}`}>Book this treatment</a>
        </div>
      </div>
    </div>}

    <SiteFooter content={content}/>
  </main>;
}
