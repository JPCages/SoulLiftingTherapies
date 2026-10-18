'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {defaultSiteContent,withDefaults,type SiteContent} from '@/lib/site-content';
import type {Category} from '@/lib/sandbox-data';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';

// Lowest standalone price in a category. Add-ons are skipped: a £10 dermaplaning
// add-on is not the entry price for facials.
function entryPrice(cat:Category):string{
  const found:number[]=[];
  for(const s of cat.services){
    if(/add[- ]on/i.test(s.name))continue;
    const m=/£\s*([\d.]+)/.exec(s.price||'');
    if(m)found.push(parseFloat(m[1]));
  }
  if(!found.length)return '';
  const low=Math.min(...found);
  return `from £${Number.isInteger(low)?low:low.toFixed(2)}`;
}

export default function Home(){
  const [content,setContent]=useState<SiteContent>(defaultSiteContent);
  useEffect(()=>{fetch('/api/content').then(r=>r.ok?r.json():null).then(x=>x&&setContent(withDefaults(x))).catch(()=>{})},[]);

  const c=content;
  const hero=c.heroImage||defaultSiteContent.heroImage;
  const cats=c.categories.filter(x=>x.services.length);
  const treatments=cats.reduce((n,x)=>n+x.services.length,0);
  const menuSub=(c.homeMenuSub??'').trim()
    || `${cats.length} kinds of treatment, ${treatments} in total.`;
  const steps=[
    {t:c.homeStep1Title,b:c.homeStep1Text},
    {t:c.homeStep2Title,b:c.homeStep2Text},
    {t:c.homeStep3Title,b:c.homeStep3Text},
  ].filter(s=>(s.t||'').trim());

  return <div className="site">
    <SiteHeader content={c}/>

    {c.notice&&<div className="site-notice">{c.notice}</div>}

    <section className="home-hero">
      <div className="home-hero-in">
        <div className="home-hero-copy">
          <p className="home-eyebrow">{c.descriptor} · Lincolnshire</p>
          <h1>{c.heroTitle} <em>{c.heroAccent}</em></h1>
          <p className="home-lede">{c.heroIntro}</p>
          <div className="home-cta">
            <a className="site-btn solid big" href="/book">Request an appointment</a>
            <a className="site-btn line big" href="/services">See the treatment menu</a>
          </div>
          <ul className="home-trust">
            <li><b>{treatments}</b> treatments</li>
            {(c.homeTrustYears||'').trim()&&<li>{c.homeTrustYears}</li>}
            {(c.homeTrustPlaces||'').trim()&&<li>{c.homeTrustPlaces}</li>}
          </ul>
        </div>
        <figure className="home-hero-photo">
          <span className="home-hero-img" style={{backgroundImage:`url('${hero}')`}} role="img" aria-label={`${c.businessName} treatment room`}/>
          {((c.homeHeroCaptionTitle||'').trim()||(c.homeHeroCaptionText||'').trim())&&
            <figcaption className="home-hero-stamp">
              {(c.homeHeroCaptionTitle||'').trim()&&<b>{c.homeHeroCaptionTitle}</b>}
              {c.homeHeroCaptionText}
            </figcaption>}
        </figure>
      </div>
    </section>

    <section className="home-section" id="treatments">
      <div className="home-in">
        <div className="home-head">
          <div>
            <p className="home-eyebrow">{c.homeMenuEyebrow}</p>
            <h2>{c.homeMenuHeading}</h2>
            <p className="home-sub">{menuSub}</p>
          </div>
          <a className="site-btn line" href="/services">Full treatment menu</a>
        </div>
        <div className="home-cats">
          {cats.map(cat=>{
            const photo=cat.image||cat.banner;
            const price=entryPrice(cat);
            return <a className="home-cat" href="/services" key={cat.name}>
              {photo
                ? <span className="home-cat-photo" style={{backgroundImage:`url('${photo}')`,backgroundPosition:`center ${cat.imagePos??cat.bannerPos??50}%`}}/>
                : <span className="home-cat-photo blank"><Image src="/brand/mark-lotus.webp" alt="" width={160} height={160}/></span>}
              <span className="home-cat-body">
                <span className="home-cat-name">{cat.name}</span>
                <span className="home-cat-short">{cat.short}</span>
                <span className="home-cat-foot">{price&&<span className="home-cat-price">{price}</span>}<span className="home-cat-go">View treatments</span></span>
              </span>
            </a>;
          })}
        </div>
      </div>
    </section>

    {steps.length>0&&<section className="home-how" id="how">
      <div className="home-in">
        <div className="home-head">
          <div>
            <p className="home-eyebrow">{c.homeHowEyebrow}</p>
            <h2>{c.homeHowHeading}</h2>
            {(c.homeHowIntro||'').trim()&&<p className="home-sub">{c.homeHowIntro}</p>}
          </div>
        </div>
        <ol className="home-steps">
          {steps.map((s,i)=><li className="home-step" key={i}><b>{s.t}</b><span>{s.b}</span></li>)}
        </ol>
      </div>
    </section>}

    <section className="home-section" id="find">
      <div className="home-in">
        <div className="home-head">
          <div>
            <h2>{c.homeFindHeading}</h2>
            {(c.homeFindIntro||'').trim()&&<p className="home-sub">{c.homeFindIntro}</p>}
          </div>
        </div>
        <div className="home-places">
          {c.horncastle&&<article className="home-place">
            <h3>Horncastle</h3><p>{c.horncastle}</p>
            {(c.horncastleHours||'').trim()&&<p className="home-hours">{c.horncastleHours}</p>}
          </article>}
          {c.woodhall&&<article className="home-place">
            <h3>Woodhall Spa</h3><p>{c.woodhall}</p>
            {(c.woodhallHours||'').trim()&&<p className="home-hours">{c.woodhallHours}</p>}
          </article>}
        </div>
        <p className="home-reach">
          {c.phone&&<span>Call or text <a href={`tel:${c.phone.replace(/\s/g,'')}`}>{c.phone}</a></span>}
          {c.email&&<span>Email <a href={`mailto:${c.email}`}>{c.email}</a></span>}
        </p>
      </div>
    </section>

    <section className="home-account">
      <div className="home-in home-account-in">
        <div>
          <p className="home-eyebrow">{c.homePrivateEyebrow}</p>
          <h2>{c.homePrivateHeading}</h2>
          {(c.homePrivateIntro||'').trim()&&<p className="home-sub">{c.homePrivateIntro}</p>}
        </div>
        <a className="site-btn pale big" href="/login">{c.homeLoginCta}</a>
      </div>
    </section>

    <SiteFooter content={c}/>
  </div>;
}
