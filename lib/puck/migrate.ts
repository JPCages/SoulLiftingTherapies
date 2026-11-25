import type {SiteContent} from '@/lib/site-content';
import type {SitePuckData} from './config';

// Build the homepage Puck document from the fields Emma has already saved, in
// the high-end layout: full-screen photo, welcome statement, treatment cards,
// booking and find-us side by side with photos, then the accounts band.
// Every word comes from her saved content. Her stored document is never
// emptied: the old fields stay in place underneath.
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
    lede:'',
    primaryCta:'Request an appointment',
    secondaryCta:'Explore treatments',
    trustYears:c.homeTrustYears??'',
    trustPlaces:c.homeTrustPlaces??'',
    image:c.heroImage??'',
    mobileImage:'',
    captionTitle:c.homeHeroCaptionTitle??'',
    captionText:c.homeHeroCaptionText??'',
  }});

  // The paragraph that sat under the headline becomes the welcome statement.
  if((c.heroIntro||'').trim()){
    content.push({type:'Welcome',props:{id:'welcome',eyebrow:`Welcome to ${c.businessName}`,text:c.heroIntro}});
  }

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
      image:'/images/room-shelf.jpeg',
    }});
  }

  content.push({type:'FindUs',props:{
    id:'find',
    eyebrow:'Find us',
    heading:c.homeFindHeading??'',
    intro:c.homeFindIntro??'',
    image:'',
  }});

  content.push({type:'AccountStrip',props:{
    id:'account',
    eyebrow:c.homePrivateEyebrow??'',
    heading:c.homePrivateHeading??'',
    intro:c.homePrivateIntro??'',
    ctaLabel:c.homeLoginCta??'',
    image:'',
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
