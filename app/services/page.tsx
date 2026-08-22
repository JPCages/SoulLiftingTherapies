'use client';

import { useEffect, useMemo, useState } from 'react';
import { defaultSiteContent, type SiteContent } from '@/lib/site-content';

const tabs = ['Massage','Facials','Advanced Facials','Waxing','Eyes & Lashes','Cryotherapy','Holistic'];
const categoryName:Record<string,string>={Massage:'Massage',Facials:'Facials & advanced skin','Advanced Facials':'Facials & advanced skin',Waxing:'Lycon waxing','Eyes & Lashes':'Eyes & lashes',Cryotherapy:'Cryotherapy',Holistic:'Holistic treatments'};
const images:Record<string,string>={Massage:'/images/room-forest.jpeg','Facials & advanced skin':'/images/lymphflo.png','Lycon waxing':'/images/wax-underarm.jpg','Eyes & lashes':'/images/emma.jpeg',Cryotherapy:'/images/room-shelf.jpeg','Holistic treatments':'/images/room-forest.jpeg'};

export default function Services(){
  const [content,setContent]=useState<SiteContent>(defaultSiteContent);
  const [active,setActive]=useState('Massage');
  useEffect(()=>{fetch('/api/content').then(r=>r.ok?r.json():null).then(x=>x&&setContent(x)).catch(()=>{})},[]);
  const category=useMemo(()=>content.categories.find(c=>c.name===categoryName[active])??content.categories[0],[active,content]);
  return <main className="treatments-app">
    <header className="app-topbar"><a className="mini-brand" href="/" aria-label="Soul Lifting Therapies home"><span className="lotus">♢</span><span>SOUL LIFTING<br/>THERAPIES</span></a><h1>{content.servicesTitle||'Treatments'}</h1><a className="basket" href="/book" aria-label="Bookings">⌑</a></header>
    <nav className="treatment-tabs" aria-label="Treatment categories">{tabs.map(tab=><button key={tab} className={active===tab?'active':''} onClick={()=>setActive(tab)}>{tab}</button>)}</nav>
    <section className="catalogue-list" aria-live="polite"><div className={category.banner?'catalogue-intro has-banner':'catalogue-intro'} style={category.banner?{backgroundImage:`linear-gradient(rgba(4,32,34,.55),rgba(4,32,34,.35)),url('${category.banner}')`}:undefined}><h2>{active}</h2><p>{category.short}</p></div>{category.services.map((service,index)=><a className="luxury-treatment-card" href="/book" key={service.name}>
      <span className="treatment-photo" style={{backgroundImage:`linear-gradient(rgba(3,35,35,.03),rgba(3,35,35,.03)),url('${service.image||category.image||images[category.name]}')`,backgroundPosition:index%2?'center 62%':'center'}}/>
      <span className="treatment-copy"><strong>{service.name}</strong><span className="duration"><i>◷</i> {service.duration}</span><span className="price">{service.price}</span></span><span className="chevron">›</span>
    </a>)}</section>
    <aside className="catalogue-help"><p>{content.servicesHelpHeading||'Not sure which treatment is right for you?'}</p><a href={`https://wa.me/44${content.phone.replace(/\D/g,'').replace(/^0/,'')}`}>{content.servicesHelpCta||'Ask Emma'}</a></aside>
    <nav className="app-bottom-nav" aria-label="Main navigation"><a href="/"><span>⌂</span>Home</a><a className="active" href="/services"><span>▣</span>Treatments</a><a href="/account"><span>✿</span>Rewards</a><a href="/book"><span>▤</span>Bookings</a><a href="/account"><span>♙</span>Profile</a></nav>
  </main>
}
