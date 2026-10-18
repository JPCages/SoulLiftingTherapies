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

const liveCats=(c:SiteContent)=>c.categories.filter(x=>x.services.length);

export type Blocks={
  Notice:{text:string};
  Hero:{eyebrow:string;title:string;accent:string;lede:string;primaryCta:string;secondaryCta:string;
        trustYears:string;trustPlaces:string;image:string;captionTitle:string;captionText:string};
  TreatmentMenu:{eyebrow:string;heading:string;sub:string;ctaLabel:string};
  HowBooking:{eyebrow:string;heading:string;intro:string;steps:{title:string;text:string}[]};
  FindUs:{heading:string;intro:string};
  AccountStrip:{eyebrow:string;heading:string;intro:string;ctaLabel:string};
};

export const config:Config<Blocks>={
  // No page-level fields: the title and description are not editable yet, and a
  // control that changes nothing is worse than no control.
  root:{fields:{}},
  categories:{
    page:{title:'Page sections',components:['Hero','TreatmentMenu','HowBooking','FindUs','AccountStrip']},
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
      label:'Hero',
      fields:{
        eyebrow:{type:'text',label:'Small line above the headline'},
        title:{type:'text',label:'Headline'},
        accent:{type:'text',label:'Headline, italic part'},
        lede:{type:'textarea',label:'Opening paragraph'},
        primaryCta:{type:'text',label:'Main button'},
        secondaryCta:{type:'text',label:'Second button'},
        trustYears:{type:'text',label:'Experience line (blank to hide)'},
        trustPlaces:{type:'text',label:'Locations line (blank to hide)'},
        // The upload control is client-only, so the editor swaps it in. On the
        // server this stays a plain field and is never rendered.
        image:{type:'text',label:'Photo'},
        captionTitle:{type:'text',label:'Caption title (blank to hide)'},
        captionText:{type:'textarea',label:'Caption text'},
      },
      defaultProps:{eyebrow:'',title:'',accent:'',lede:'',primaryCta:'Request an appointment',
        secondaryCta:'See the treatment menu',trustYears:'',trustPlaces:'',image:'',captionTitle:'',captionText:''},
      render:({eyebrow,title,accent,lede,primaryCta,secondaryCta,trustYears,trustPlaces,image,captionTitle,captionText,puck})=>{
        const c=site(puck);
        const treatments=liveCats(c).reduce((n,x)=>n+x.services.length,0);
        return <section className="home-hero">
          <div className="home-hero-in">
            <div className="home-hero-copy">
              <p className="home-eyebrow">{eyebrow}</p>
              <h1>{title} <em>{accent}</em></h1>
              <p className="home-lede">{lede}</p>
              <div className="home-cta">
                <a className="site-btn solid big" href="/book">{primaryCta}</a>
                <a className="site-btn line big" href="/services">{secondaryCta}</a>
              </div>
              <ul className="home-trust">
                <li><b>{treatments}</b> treatments</li>
                {trustYears.trim()&&<li>{trustYears}</li>}
                {trustPlaces.trim()&&<li>{trustPlaces}</li>}
              </ul>
            </div>
            <figure className="home-hero-photo">
              <span className="home-hero-img" style={{backgroundImage:`url('${image}')`}} role="img" aria-label={`${c.businessName} treatment room`}/>
              {(captionTitle.trim()||captionText.trim())&&
                <figcaption className="home-hero-stamp">
                  {captionTitle.trim()&&<b>{captionTitle}</b>}
                  {captionText}
                </figcaption>}
            </figure>
          </div>
        </section>;
      },
    },

    TreatmentMenu:{
      label:'Treatment menu',
      fields:{
        eyebrow:{type:'text',label:'Small line above the heading'},
        heading:{type:'text',label:'Heading'},
        sub:{type:'text',label:'Sub-heading (blank counts the menu for you)'},
        ctaLabel:{type:'text',label:'Button'},
      },
      defaultProps:{eyebrow:'Treatment menu',heading:'',sub:'',ctaLabel:'Full treatment menu'},
      render:({eyebrow,heading,sub,ctaLabel,puck})=>{
        const c=site(puck);
        const cats=liveCats(c);
        const treatments=cats.reduce((n,x)=>n+x.services.length,0);
        const subline=sub.trim()||`${cats.length} kinds of treatment, ${treatments} in total.`;
        return <section className="home-section" id="treatments">
          <div className="home-in">
            <div className="home-head">
              <div>
                <p className="home-eyebrow">{eyebrow}</p>
                <h2>{heading}</h2>
                <p className="home-sub">{subline}</p>
              </div>
              <a className="site-btn line" href="/services">{ctaLabel}</a>
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
      },
      defaultProps:{eyebrow:'Booking',heading:'How booking works',intro:'',steps:[]},
      render:({eyebrow,heading,intro,steps})=>{
        const live=(steps||[]).filter(s=>(s.title||'').trim());
        if(!live.length)return <></>;
        return <section className="home-how" id="how">
          <div className="home-in">
            <div className="home-head">
              <div>
                <p className="home-eyebrow">{eyebrow}</p>
                <h2>{heading}</h2>
                {intro.trim()&&<p className="home-sub">{intro}</p>}
              </div>
            </div>
            <ol className="home-steps">
              {live.map((s,i)=><li className="home-step" key={i}><b>{s.title}</b><span>{s.text}</span></li>)}
            </ol>
          </div>
        </section>;
      },
    },

    FindUs:{
      label:'Where to find Emma',
      fields:{
        heading:{type:'text',label:'Heading'},
        intro:{type:'textarea',label:'Intro'},
      },
      defaultProps:{heading:'Where to find Emma',intro:''},
      render:({heading,intro,puck})=>{
        const c=site(puck);
        return <section className="home-section" id="find">
          <div className="home-in">
            <div className="home-head">
              <div>
                <h2>{heading}</h2>
                {intro.trim()&&<p className="home-sub">{intro}</p>}
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
      },
      defaultProps:{eyebrow:'',heading:'',intro:'',ctaLabel:'Log in or create an account'},
      render:({eyebrow,heading,intro,ctaLabel})=><section className="home-account">
        <div className="home-in home-account-in">
          <div>
            <p className="home-eyebrow">{eyebrow}</p>
            <h2>{heading}</h2>
            {intro.trim()&&<p className="home-sub">{intro}</p>}
          </div>
          <a className="site-btn pale big" href="/login">{ctaLabel}</a>
        </div>
      </section>,
    },
  },
};

export type SitePuckData=Data<Blocks>;
