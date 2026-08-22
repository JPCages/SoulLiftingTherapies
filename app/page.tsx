'use client';
import {useEffect,useState} from 'react';
import {defaultSiteContent,type SiteContent} from '@/lib/site-content';
export default function Home(){
  const [content,setContent]=useState<SiteContent>(defaultSiteContent);
  useEffect(()=>{fetch('/api/content').then(r=>r.ok?r.json():null).then(x=>x&&setContent(x)).catch(()=>{})},[]);
  const hero=content.heroImage||defaultSiteContent.heroImage;
  return <main><header className="nav"><a className="wordmark" href="/">{content.businessName.split(' ').slice(0,-1).join(' ')} <i>{content.businessName.split(' ').at(-1)}</i></a><a className="nav-button" href="/login">Log in</a></header>{content.notice&&<div className="site-notice">{content.notice}</div>}<section className="hero"><div><p className="eyebrow">{content.descriptor} · Lincolnshire</p><h1>{content.heroTitle} <em>{content.heroAccent}</em></h1><p>{content.heroIntro}</p><div className="actions"><a className="primary" href="/services">Explore treatments</a><a className="secondary" href="/book">Book a treatment</a></div></div><div className="hero-image" style={{backgroundImage:`url('${hero}')`}}/></section><section className="intro-section"><p className="eyebrow">{content.homeMenuEyebrow}</p><h2>{content.homeMenuHeading}</h2><div className="cards">{content.categories.filter(c=>c.services.length).slice(0,6).map(c=><a href="/services" key={c.name}><article><h3>{c.name}</h3><p>{c.short}</p><b>Explore →</b></article></a>)}</div></section><section className="intro-section"><p className="eyebrow">{content.homePrivateEyebrow}</p><h2>{content.homePrivateHeading}</h2><p>{content.homePrivateIntro}</p><a className="primary" href="/login">{content.homeLoginCta}</a></section><footer><p>{content.businessName} · {content.phone} · {content.email}</p></footer></main>;
}
