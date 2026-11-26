// Plain-English summary of what one save changed, for Emma's "Undo" list.
// Compares the content before and after a save, area by area.

type Doc=Record<string,unknown>;

// Which portal area each stored field belongs to. Anything not listed falls
// under "Other wording".
const AREAS:[string,RegExp][]=[
  ['Homepage',/^(puck|hero|home|notice|welcome)/],
  ['Treatments',/^(categories|services)/],
  ['Customer app',/^(account|feeling|appointment|wellbeing|points|journey)/],
  ['Booking page',/^booking/],
  ['Sign-in page',/^login/],
  ['Business details',/^(businessName|descriptor|phone|email|horncastle|woodhall|seo)/],
  ['Loyalty rules',/^loyalty/],
  ['Reply messages',/^reply/],
];

export function areaFor(key:string):string{
  for(const [name,re] of AREAS)if(re.test(key))return name;
  return 'Other wording';
}

// Postgres JSONB does not keep key order, so compare with keys sorted.
function stable(v:unknown):string{
  if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v as Doc).filter(k=>(v as Doc)[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stable((v as Doc)[k])).join(',')+'}';
  return JSON.stringify(v)??'null';
}

export function summariseChange(before:Doc|null|undefined,after:Doc):string{
  if(!before)return 'First save';
  const keys=new Set([...Object.keys(before),...Object.keys(after)]);
  const areas=new Set<string>();
  for(const k of keys){
    if(stable(before[k]??null)!==stable(after[k]??null))areas.add(areaFor(k));
  }
  if(!areas.size)return 'No changes';
  return 'Changed '+[...areas].join(', ');
}

export const HISTORY_KEEP=10;
