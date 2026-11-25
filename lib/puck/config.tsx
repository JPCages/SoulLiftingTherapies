import Image from 'next/image';
import type {Config, Data} from '@puckeditor/core';
import type {SiteContent} from '@/lib/site-content';
import type {Category} from '@/lib/sandbox-data';

// Business details, the treatment catalogue and anything else Emma edits as a
// record rather than as a block reach the blocks through Puck metadata. They are
// never copied into block props, so there is exactly one place to change them.
export type SiteMeta = {content:SiteContent};
type R = {puck:{metadata:Record<string,unknown>}};
const site = (puck:R['puck']):SiteContent => (puck.metadata as SiteMeta).content;

// Lowest standalone price in a category. Add-ons are skipped: a £10 dermaplaning
// add-on is not the entry price for facials.
export function entryPrice(cat:Category):string{
  const found:number[]=[];
  for(const s of cat.services){
    if(/add[- ]on/i.test(s.name))continue;
    const m=/£\s*([\d.]+)/.exec(s.price||'');
    if(m)found.push(parseFloat(m[1]));
  }
  if(!found.length)return '';
  const low=Math.min(...found);
  return `From £${Number.isInteger(low)?low:low.toFixed(2)}`;
}

// The photo on a category's homepage card. Banners are wide header graphics
// (some are supplier adverts with words on them) and crop badly in a tall card,
// so they are never used here: no card photo means the brand panel instead.
export function cardPhoto(cat:Category):{src:string;pos:number}|null{
  if(cat.cardImage)return {src:cat.cardImage,pos:cat.cardImagePos??50};
  if(cat.image)return {src:cat.image,pos:cat.imagePos??50};
  return null;
}

const liveCats=(c:SiteContent)=>c.categories.filter(x=>x.services.length);
const has=(s?:string)=>!!(s||'').trim();

// One line built from her loyalty settings, so it can never disagree with them.
function loyaltyLine(c:SiteContent):string{
  if(c.loyaltyEnabled===false)return '';
  const per=c.loyaltyPoundsPerPoint??10, need=c.loyaltyRewardPoints??40, what=(c.loyaltyRewardText||'').trim();
  if(!what)return '';
  return `Soul Points: every £${per} earns a point. ${need} points earns a ${what}.`;
}

function Lotus({size}:{size:number}){
  return <Image src="/brand/mark-lotus.webp" alt="" width={size*2} height={size*2} style={{width:size,height:size,borderRadius:'50%'}}/>;
}

export type Blocks={
  Notice:{text:string};
  Hero:{eyebrow:string;title:string;accent:string;lede:string;primaryCta:string;secondaryCta:string;
        trustYears:string;trustPlaces:string;image:string;mobileImage:string;captionTitle:string;captionText:string};
  Welcome:{eyebrow:string;text:string};
  TreatmentMenu:{eyebrow:string;heading:string;sub:string;ctaLabel:string};
  HowBooking:{eyebrow:string;heading:string;intro:string;steps:{title:string;text:string}[];image:string};
  FindUs:{eyebrow:string;heading:string;intro:string;image:string};
  AccountStrip:{eyebrow:string;heading:string;intro:string;ctaLabel:string;image:string};
};

// Names of the fields that hold a picture. The editor swaps each for the same
// upload control used elsewhere in the portal (lib/puck/editor-config.tsx).
export const IMAGE_FIELDS=['image','mobileImage'] as const;

export const config:Config<Blocks>={
  // No page-level fields: the page title lives in Business details > Search & sharing.
  root:{fields:{}},
  categories:{
    page:{title:'Page sections',components:['Hero','Welcome','TreatmentMenu','HowBooking','FindUs','AccountStrip']},
    bar:{title:'Banners',components:['Notice']},
  },
  components:{
    Notice:{
      label:'Notice bar',
      fields:{text:{type:'textarea',label:'Message (leave blank to hide)'}},
      defaultProps:{text:''},
      render:({text})=>text.trim()?<div className="site-notice">{text}</div>:<></>,
    },

    Hero:{
      label:'Hero (full-screen photo)',
      fields:{
        eyebrow:{type:'text',label:'Small line above the headline'},
        title:{type:'text',label:'Headline'},
        accent:{type:'text',label:'Headline, italic part'},
        lede:{type:'textarea',label:'Paragraph under the headline (optional)'},
        primaryCta:{type:'text',label:'Main button'},
        secondaryCta:{type:'text',label:'Second button'},
        trustYears:{type:'text',label:'Experience line (blank to hide)'},
        trustPlaces:{type:'text',label:'Locations line (blank to hide)'},
        image:{type:'text',label:'Photo (landscape, for computers)'},
        mobileImage:{type:'text',label:'Photo for phones (portrait, optional)'},
        captionTitle:{type:'text',label:'Caption title (blank to hide)'},
        captionText:{type:'textarea',label:'Caption text'},
      },
      defaultProps:{eyebrow:'',title:'',accent:'',lede:'',primaryCta:'Request an appointment',
        secondaryCta:'Explore treatments',trustYears:'',trustPlaces:'',image:'',mobileImage:'',captionTitle:'',captionText:''},
      render:({eyebrow,title,accent,lede,primaryCta,secondaryCta,trustYears,trustPlaces,image,mobileImage,puck})=>{
        const c=site(puck);
        const treatments=liveCats(c).reduce((n,x)=>n+x.services.length,0);
        const desk=image||mobileImage, phone=mobileImage||image;
        return <section className="lux-hero">
          {desk&&<picture>
            {phone!==desk&&<source media="(max-width: 760px)" srcSet={phone}/>}
            <img className="lux-hero-img" src={desk} alt={`${c.businessName} treatment room`}/>
          </picture>}
          <div className="lux-hero-shade" aria-hidden="true"/>
          <div className="lux-hero-body">
            {has(eyebrow)&&<p className="lux-label lux-label-light">{eyebrow}</p>}
            <h1 className="lux-hero-title">{title} {has(accent)&&<em>{accent}</em>}</h1>
            {has(lede)&&<p className="lux-hero-lede">{lede}</p>}
            <div className="lux-hero-cta">
              <a className="lux-btn lux-btn-cream" href="/book">{primaryCta}</a>
              <a className="lux-btn lux-btn-ghost" href="/services">{secondaryCta}</a>
            </div>
          </div>
          <ul className="lux-hero-trust">
            <li>{treatments} treatments</li>
            {has(trustYears)&&<li>{trustYears}</li>}
            {has(trustPlaces)&&<li>{trustPlaces}</li>}
          </ul>
        </section>;
      },
    },

    Welcome:{
      label:'Welcome statement',
      fields:{
        eyebrow:{type:'text',label:'Small line above'},
        text:{type:'textarea',label:'Statement'},
      },
      defaultProps:{eyebrow:'Welcome',text:''},
      render:({eyebrow,text})=>has(text)?<section className="lux-welcome">
        <Lotus size={52}/>
        {has(eyebrow)&&<p className="lux-label">{eyebrow}</p>}
        <p className="lux-welcome-text">{text}</p>
      </section>:<></>,
    },

    TreatmentMenu:{
      label:'Treatment menu',
      fields:{
        eyebrow:{type:'text',label:'Small line above the heading'},
        heading:{type:'text',label:'Heading'},
        sub:{type:'text',label:'Sub-heading (optional)'},
        ctaLabel:{type:'text',label:'Link to the full menu'},
      },
      defaultProps:{eyebrow:'Treatment menu',heading:'',sub:'',ctaLabel:'Full treatment menu'},
      render:({eyebrow,heading,sub,ctaLabel,puck})=>{
        const c=site(puck);
        const cats=liveCats(c);
        return <section className="lux-menu" id="treatments">
          <div className="lux-in">
            <div className="lux-head">
              <div className="lux-head-text">
                {has(eyebrow)&&<p className="lux-label">{eyebrow}</p>}
                <h2 className="lux-h2">{heading}</h2>
                {has(sub)&&<p className="lux-sub">{sub}</p>}
              </div>
              <a className="lux-textlink" href="/services">{ctaLabel}</a>
            </div>
            <div className="lux-cards">
              {cats.map(cat=>{
                const photo=cardPhoto(cat);
                const price=entryPrice(cat);
                return <a className="lux-card" href="/services" key={cat.name}>
                  {photo
                    ? <img className="lux-card-img" src={photo.src} alt="" style={{objectPosition:`50% ${photo.pos}%`}}/>
                    : <span className="lux-card-img lux-card-blank"><Lotus size={84}/></span>}
                  <span className="lux-card-body">
                    {price&&<span className="lux-label">{price}</span>}
                    <span className="lux-card-name">{cat.name}</span>
                    <span className="lux-card-short">{cat.short}</span>
                    <span className="lux-card-go">Explore →</span>
                  </span>
                </a>;
              })}
            </div>
          </div>
        </section>;
      },
    },

    HowBooking:{
      label:'How booking works',
      fields:{
        eyebrow:{type:'text',label:'Small line above the heading'},
        heading:{type:'text',label:'Heading'},
        intro:{type:'textarea',label:'Intro'},
        steps:{type:'array',label:'Steps',arrayFields:{title:{type:'text',label:'Step title'},text:{type:'textarea',label:'Step text'}},
          getItemSummary:(item,i)=>item.title||`Step ${(i??0)+1}`},
        image:{type:'text',label:'Photo beside it (optional)'},
      },
      defaultProps:{eyebrow:'Booking',heading:'How booking works',intro:'',steps:[],image:''},
      render:({eyebrow,heading,intro,steps,image})=>{
        const live=(steps||[]).filter(s=>has(s.title));
        if(!live.length)return <></>;
        return <section className="lux-split lux-split-dark" id="how">
          {image&&<div className="lux-split-photo"><img src={image} alt=""/></div>}
          <div className="lux-split-text">
            {has(eyebrow)&&<p className="lux-label lux-label-light">{eyebrow}</p>}
            <h2 className="lux-h2">{heading}</h2>
            {has(intro)&&<p className="lux-sub">{intro}</p>}
            <ol className="lux-steps">
              {live.map((s,i)=><li key={i}><span className="lux-step-no">{String(i+1).padStart(2,'0')}</span><span><b>{s.title}</b><span>{s.text}</span></span></li>)}
            </ol>
            <div><a className="lux-btn lux-btn-cream" href="/book">Request an appointment</a></div>
          </div>
        </section>;
      },
    },

    FindUs:{
      label:'Where to find Emma',
      fields:{
        eyebrow:{type:'text',label:'Small line above the heading'},
        heading:{type:'text',label:'Heading'},
        intro:{type:'textarea',label:'Intro'},
        image:{type:'text',label:'Photo beside it (optional)'},
      },
      defaultProps:{eyebrow:'Find us',heading:'Where to find Emma',intro:'',image:''},
      render:({eyebrow,heading,intro,image,puck})=>{
        const c=site(puck);
        return <section className="lux-split lux-split-sand lux-split-flip" id="find">
          {image&&<div className="lux-split-photo"><img src={image} alt=""/></div>}
          <div className="lux-split-text">
            {has(eyebrow)&&<p className="lux-label">{eyebrow}</p>}
            <h2 className="lux-h2">{heading}</h2>
            {has(intro)&&<p className="lux-sub">{intro}</p>}
            <div className="lux-places">
              {c.horncastle&&<div className="lux-place"><h3>Horncastle</h3><p>{c.horncastle}</p>{has(c.horncastleHours)&&<p className="lux-hours">{c.horncastleHours}</p>}</div>}
              {c.woodhall&&<div className="lux-place"><h3>Woodhall Spa</h3><p>{c.woodhall}</p>{has(c.woodhallHours)&&<p className="lux-hours">{c.woodhallHours}</p>}</div>}
            </div>
            <p className="lux-reach">
              {c.phone&&<span>Call or text <a href={`tel:${c.phone.replace(/\s/g,'')}`}>{c.phone}</a></span>}
              {c.email&&<span>Email <a href={`mailto:${c.email}`}>{c.email}</a></span>}
            </p>
          </div>
        </section>;
      },
    },

    AccountStrip:{
      label:'Customer accounts',
      fields:{
        eyebrow:{type:'text',label:'Small line above the heading'},
        heading:{type:'text',label:'Heading'},
        intro:{type:'textarea',label:'Intro'},
        ctaLabel:{type:'text',label:'Button'},
        image:{type:'text',label:'Background photo (optional)'},
      },
      defaultProps:{eyebrow:'',heading:'',intro:'',ctaLabel:'Log in or create an account',image:''},
      render:({eyebrow,heading,intro,ctaLabel,image,puck})=>{
        const loyal=loyaltyLine(site(puck));
        return <section className="lux-band">
          {image&&<img className="lux-band-img" src={image} alt=""/>}
          <div className="lux-band-shade" aria-hidden="true"/>
          <div className="lux-band-body">
            {has(eyebrow)&&<p className="lux-label lux-label-light">{eyebrow}</p>}
            <h2 className="lux-h2">{heading}</h2>
            {has(intro)&&<p className="lux-sub">{intro}</p>}
            {loyal&&<p className="lux-loyalty">{loyal}</p>}
            <div><a className="lux-btn lux-btn-ghost" href="/login">{ctaLabel}</a></div>
          </div>
        </section>;
      },
    },
  },
};

export type SitePuckData=Data<Blocks>;
