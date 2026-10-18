import type {SiteContent} from '@/lib/site-content';
import type {SitePuckData} from './config';

// Build the homepage Puck document from the fields Emma has already saved.
// This runs once, the first time the new portal is opened, and reproduces the
// live homepage exactly — same sections, same order, same words. Her stored
// document is never emptied: the old fields stay in place underneath.
export function siteContentToPuck(c:SiteContent):SitePuckData{
  const content:SitePuckData['content']=[];

  if((c.notice||'').trim()){
    content.push({type:'Notice',props:{id:'notice',text:c.notice}});
  }

  content.push({type:'Hero',props:{
    id:'hero',
    eyebrow:`${c.descriptor} · Lincolnshire`,
    title:c.heroTitle??'',
    accent:c.heroAccent??'',
    lede:c.heroIntro??'',
    primaryCta:'Request an appointment',
    secondaryCta:'See the treatment menu',
    trustYears:c.homeTrustYears??'',
    trustPlaces:c.homeTrustPlaces??'',
    image:c.heroImage??'',
    captionTitle:c.homeHeroCaptionTitle??'',
    captionText:c.homeHeroCaptionText??'',
  }});

  content.push({type:'TreatmentMenu',props:{
    id:'menu',
    eyebrow:c.homeMenuEyebrow??'',
    heading:c.homeMenuHeading??'',
    sub:c.homeMenuSub??'',
    ctaLabel:'Full treatment menu',
  }});

  const steps=[
    {title:c.homeStep1Title??'',text:c.homeStep1Text??''},
    {title:c.homeStep2Title??'',text:c.homeStep2Text??''},
    {title:c.homeStep3Title??'',text:c.homeStep3Text??''},
  ].filter(s=>s.title.trim());
  if(steps.length){
    content.push({type:'HowBooking',props:{
      id:'how',
      eyebrow:c.homeHowEyebrow??'',
      heading:c.homeHowHeading??'',
      intro:c.homeHowIntro??'',
      steps,
    }});
  }

  content.push({type:'FindUs',props:{
    id:'find',
    heading:c.homeFindHeading??'',
    intro:c.homeFindIntro??'',
  }});

  content.push({type:'AccountStrip',props:{
    id:'account',
    eyebrow:c.homePrivateEyebrow??'',
    heading:c.homePrivateHeading??'',
    intro:c.homePrivateIntro??'',
    ctaLabel:c.homeLoginCta??'',
  }});

  return {root:{props:{}},content};
}

// What the homepage renders: her saved layout once she has published one,
// otherwise the layout derived from her existing content.
export function homepageData(c:SiteContent):SitePuckData{
  const stored=c.puck;
  return stored&&Array.isArray(stored.content)&&stored.content.length
    ? stored as SitePuckData
    : siteContentToPuck(c);
}
