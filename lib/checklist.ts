import type {SiteContent} from './site-content';

// Emma's launch to-do list. Answers that ARE site content (opening hours, card
// photos) are saved straight into the site; everything else (privacy answers,
// sign-offs) is kept privately in app_settings, never in the public content API.

export const CHECKLIST_KEY='launch_checklist';

export const PRIVACY_QUESTIONS=[
  {id:'legalEntity',label:'Who is the business, legally?',hint:'Sole trader trading as Soul Lifting Therapies, or a limited company? If limited, the company name and number.'},
  {id:'contactAddress',label:'What address should the privacy policy give?',hint:'A contact address for data questions. One of the salons is fine.'},
  {id:'retention',label:'How long do you keep client records?',hint:'Treatment notes, patch tests, contact details — whatever your insurer or training body asks.'},
  {id:'cancellation',label:'What is your cancellation and deposit policy?',hint:'In your own words: how much notice, what happens to a deposit, and to a no-show.'},
  {id:'processors',label:'Who else holds your client data?',hint:'Fresha, and anyone else — an insurer portal, a till system, a mailing list.'},
] as const;

export const SIGN_OFFS=[
  {id:'prices',label:'I have checked every price and duration on the treatment menu.'},
  {id:'wording',label:'The wording for cryotherapy, microneedling and peels is mine and I am happy with it.'},
  {id:'brands',label:'I am trained or accredited to offer and advertise Lycon, CryoPen, The Million Dollar Facial, Lymphflo and Nouveau LVL.'},
  {id:'photoRights',label:'Every photo on the site is my own or I have permission to use it.'},
  {id:'ownPhoto',label:'I am happy for my own photo to appear on the homepage.'},
] as const;

export type ChecklistAnswers={
  privacy:Record<string,string>;
  signOffs:Record<string,boolean>;
  notes:string;
  updatedAt?:string;
};

export const emptyAnswers=():ChecklistAnswers=>({privacy:{},signOffs:{},notes:''});

// Keep only known keys, as strings or booleans of sensible length. The portal
// sends whatever is in the form; this is what is allowed to be stored.
export function cleanAnswers(input:unknown):ChecklistAnswers{
  const src=(input&&typeof input==='object'?input:{}) as Record<string,unknown>;
  const p=(src.privacy&&typeof src.privacy==='object'?src.privacy:{}) as Record<string,unknown>;
  const s=(src.signOffs&&typeof src.signOffs==='object'?src.signOffs:{}) as Record<string,unknown>;
  const out=emptyAnswers();
  for(const q of PRIVACY_QUESTIONS){
    const v=p[q.id];
    if(typeof v==='string'&&v.trim())out.privacy[q.id]=v.trim().slice(0,2000);
  }
  for(const o of SIGN_OFFS){
    if(s[o.id]===true)out.signOffs[o.id]=true;
  }
  if(typeof src.notes==='string')out.notes=src.notes.trim().slice(0,4000);
  return out;
}

export function parseAnswers(raw:string|null):ChecklistAnswers{
  if(!raw)return emptyAnswers();
  try{
    const parsed=JSON.parse(raw) as {updatedAt?:unknown};
    const at=typeof parsed?.updatedAt==='string'?parsed.updatedAt:undefined;
    return {...cleanAnswers(parsed),...(at?{updatedAt:at}:{})};
  }catch{return emptyAnswers()}
}

export type ChecklistItem={id:string;title:string;done:boolean;detail:string};

// What is still missing, worked out from the live content and her answers.
export function checklistStatus(c:SiteContent,a:ChecklistAnswers):ChecklistItem[]{
  const cats=c.categories.filter(x=>x.services.length);
  const noCard=cats.filter(x=>!(x.cardImage||x.image)).map(x=>x.name);
  const noPhoto=cats.flatMap(x=>x.services.filter(s=>!s.image).map(s=>s.name));
  const hoursMissing=[!(c.horncastleHours||'').trim()&&'Horncastle',!(c.woodhallHours||'').trim()&&'Woodhall Spa'].filter(Boolean) as string[];
  const privacyLeft=PRIVACY_QUESTIONS.filter(q=>!a.privacy[q.id]).length;
  const signLeft=SIGN_OFFS.filter(o=>!a.signOffs[o.id]).length;
  return [
    {id:'hours',title:'Opening hours',done:hoursMissing.length===0,detail:hoursMissing.length?`Still needed for ${hoursMissing.join(' and ')}.`:'Both locations done.'},
    {id:'cards',title:'Homepage photo for each treatment type',done:noCard.length===0,detail:noCard.length?`No photo yet for ${noCard.join(', ')}.`:'Every treatment type has a photo.'},
    {id:'photos',title:'Photos for individual treatments',done:noPhoto.length===0,detail:noPhoto.length?`${noPhoto.length} without their own photo: ${noPhoto.slice(0,6).join(', ')}${noPhoto.length>6?'…':''}.`:'Every treatment has a photo.'},
    {id:'privacy',title:'Five questions for your privacy policy',done:privacyLeft===0,detail:privacyLeft?`${privacyLeft} of 5 still to answer.`:'All answered — JP will draft the policy.'},
    {id:'signoffs',title:'Sign-offs',done:signLeft===0,detail:signLeft?`${signLeft} of ${SIGN_OFFS.length} still to tick.`:'All signed off.'},
  ];
}
