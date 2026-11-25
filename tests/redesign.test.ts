import {describe,expect,it} from 'vitest';
import {cleanAnswers,parseAnswers,checklistStatus,emptyAnswers} from '@/lib/checklist';
import {cardPhoto,entryPrice} from '@/lib/puck/config';
import {siteContentToPuck} from '@/lib/puck/migrate';
import {withDefaults} from '@/lib/site-content';
import type {Category} from '@/lib/sandbox-data';

const cat=(over:Partial<Category>={}):Category=>({name:'Massage',short:'s',services:[{name:'Back',price:'£40',duration:'30 minutes'}],...over});

describe('homepage card photo',()=>{
  it('prefers the card photo, then the category photo',()=>{
    expect(cardPhoto(cat({cardImage:'/a',image:'/b'}))?.src).toBe('/a');
    expect(cardPhoto(cat({image:'/b',imagePos:30}))).toEqual({src:'/b',pos:30});
  });
  it('never uses the wide banner, so adverts are not cropped into a tall card',()=>{
    expect(cardPhoto(cat({banner:'/advert'}))).toBeNull();
  });
  it('skips add-ons when working out the entry price',()=>{
    expect(entryPrice(cat({services:[{name:'Dermaplaning add-on',price:'£10',duration:''},{name:'Facial',price:'£45',duration:''}]}))).toBe('From £45');
  });
});

describe('migration to the new layout',()=>{
  const c=withDefaults({heroIntro:'Over 10 years’ experience.',businessName:'Soul Lifting Therapies'});
  const doc=siteContentToPuck(c);
  const types=doc.content.map(b=>b.type);
  it('moves the paragraph under the headline into a welcome statement',()=>{
    const hero=doc.content.find(b=>b.type==='Hero')!.props as {lede:string};
    const welcome=doc.content.find(b=>b.type==='Welcome')!.props as {text:string};
    expect(hero.lede).toBe('');
    expect(welcome.text).toBe('Over 10 years’ experience.');
  });
  it('keeps every section, in order',()=>{
    expect(types).toEqual(['Hero','Welcome','TreatmentMenu','HowBooking','FindUs','AccountStrip']);
  });
});

describe('launch checklist',()=>{
  it('keeps only known answers, trimmed',()=>{
    const a=cleanAnswers({privacy:{legalEntity:'  Sole trader ',hack:'x'},signOffs:{prices:true,brands:'yes',evil:true},notes:'hi',extra:1});
    expect(a.privacy).toEqual({legalEntity:'Sole trader'});
    expect(a.signOffs).toEqual({prices:true});
    expect(a.notes).toBe('hi');
  });
  it('survives a corrupt stored value',()=>{
    expect(parseAnswers('{not json')).toEqual(emptyAnswers());
    expect(parseAnswers(null)).toEqual(emptyAnswers());
  });
  it('reports what is missing from the live content',()=>{
    const c=withDefaults({horncastleHours:'Tue 9–5',woodhallHours:'',categories:[cat({image:'/m'}),cat({name:'Cryotherapy'})]});
    const s=Object.fromEntries(checklistStatus(c,emptyAnswers()).map(i=>[i.id,i]));
    expect(s.hours.done).toBe(false);
    expect(s.hours.detail).toMatch(/Woodhall Spa/);
    expect(s.cards.detail).toMatch(/Cryotherapy/);
    expect(s.privacy.done).toBe(false);
  });
});
