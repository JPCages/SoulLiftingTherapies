import {describe,it,expect} from 'vitest';
import {summariseChange,areaFor} from '@/lib/content-history';

describe('undo list summaries',()=>{
  it('names the areas that changed',()=>{
    expect(summariseChange({phone:'1',heroTitle:'a'},{phone:'2',heroTitle:'b'})).toBe('Changed Business details, Homepage');
  });
  it('ignores key order inside treatments (the database reorders keys)',()=>{
    const a={categories:[{name:'M',short:'s',services:[{name:'x',price:'£1'}]}]};
    const b={categories:[{short:'s',services:[{price:'£1',name:'x'}],name:'M'}]};
    expect(summariseChange(a,b)).toBe('No changes');
  });
  it('treats a missing field and an undefined one as the same',()=>{
    expect(summariseChange({phone:'1'},{phone:'1',notice:undefined})).toBe('No changes');
  });
  it('sees a hidden treatment as a treatments change',()=>{
    const a={categories:[{name:'M',services:[{name:'x'}]}]};
    const b={categories:[{name:'M',services:[{name:'x',hidden:true}]}]};
    expect(summariseChange(a,b)).toBe('Changed Treatments');
  });
  it('files unknown fields under other wording',()=>{
    expect(areaFor('somethingNew')).toBe('Other wording');
    expect(areaFor('bookingRequestHeading')).toBe('Booking page');
  });
});
