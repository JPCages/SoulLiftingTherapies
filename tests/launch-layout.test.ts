import {describe,it,expect} from 'vitest';
import {applyLaunchLayout,LAUNCH_HERO,LAUNCH_SERVICES_HERO,LAUNCH_CARD_PICKS} from '@/lib/launch-layout';

describe('launch photo choices',()=>{
  it('fills the homepage photo, treatments banner and card photos when missing',()=>{
    const out=applyLaunchLayout({heroImage:'/images/room-forest.jpeg',categories:[{name:'Massage',services:[]},{name:'Cryotherapy',services:[]}]});
    expect(out?.heroImage).toBe(LAUNCH_HERO);
    expect(out?.servicesHeroImage).toBe(LAUNCH_SERVICES_HERO);
    expect(out?.categories?.[0].cardImage).toBe(LAUNCH_CARD_PICKS.Massage);
    expect(out?.categories?.[1].cardImage).toBeUndefined();
  });
  it('never replaces anything Emma has already chosen',()=>{
    const mine={heroImage:'/api/image/mine.jpg',servicesHeroImage:'/api/image/x.jpg',categories:[{name:'Massage',cardImage:'/api/image/y.jpg',services:[]}]};
    expect(applyLaunchLayout(mine)).toBeNull();
  });
  it('keeps every other field untouched',()=>{
    const out=applyLaunchLayout({phone:'01234',categories:[{name:'Lycon Waxing',short:'s',services:[{name:'a'}]}]});
    expect(out?.phone).toBe('01234');
    expect(out?.categories?.[0]).toMatchObject({name:'Lycon Waxing',short:'s',services:[{name:'a'}]});
  });
});
