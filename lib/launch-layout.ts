// Soul Lifting Therapies, one-off (Nov 2026): the photos JP and Emma chose on the
// redesign test copy, applied to the live site once when the redesign first runs.
// Every image here is one Emma uploaded herself (stored in her own database).
// It only fills gaps: anything Emma has already set is left alone.
// Remove this file at template extraction — it is client data, not template.

export const LAUNCH_LAYOUT_KEY='seed_launch_layout_2026_11';

const img=(id:string)=>`/api/image/${id}.jpg`;
export const LAUNCH_HERO=img('e5d82f4d-e6f6-4833-9dd3-7ec808ad87c1');          // massage photo, homepage on phone and PC
export const LAUNCH_SERVICES_HERO=img('82ba95de-6107-4151-94aa-41b909e07a8e'); // head massage, treatments page banner
export const LAUNCH_CARD_PICKS:Record<string,string>={
  'Massage':img('f6456940-a822-47ca-bb91-3932a4688b7b'),
  'Facials & advanced skin':img('e1f2bab9-b3b0-444f-880d-c6d955c5c1b4'),
  'Lycon Waxing':img('a8ae175b-7fe0-47f0-8ea8-2564dd68dbc3'),
  'Eyes & lashes':img('4c35fc01-e214-400a-9f69-2a8bd1890b91'),
  'Holistic treatments':img('82ba95de-6107-4151-94aa-41b909e07a8e'),
};
// The old coded default for the homepage photo. Replaced by the massage photo
// (JP, 25 Nov 2026); any other photo Emma has chosen is kept.
const OLD_DEFAULT_HERO='/images/room-forest.jpeg';

type Stored=Record<string,unknown>&{categories?:Array<Record<string,unknown>>};

// Returns the updated stored document, or null when nothing needs changing.
export function applyLaunchLayout(stored:Stored):Stored|null{
  const next:Stored={...stored};
  let changed=false;
  if(!next.heroImage||next.heroImage===OLD_DEFAULT_HERO){next.heroImage=LAUNCH_HERO;changed=true}
  if(!next.servicesHeroImage){next.servicesHeroImage=LAUNCH_SERVICES_HERO;changed=true}
  if(Array.isArray(next.categories)){
    next.categories=next.categories.map(c=>{
      const pick=LAUNCH_CARD_PICKS[String(c.name)];
      if(pick&&!c.cardImage){changed=true;return {...c,cardImage:pick}}
      return c;
    });
  }
  return changed?next:null;
}
