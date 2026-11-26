import {describe,it,expect} from 'vitest';
import {fillReply,waNumber,replyLinks,shortTreatment} from '@/lib/reply';

const req={name:'Sam Jones',treatment:'Aromatherapy full body massage (£50, 1 hour)',location:'Horncastle',phone:'07700 900123',email:'sam@example.com'};

describe('ready-written replies',()=>{
  it('fills in first name, treatment without price, place and business',()=>{
    expect(fillReply('Hi {name}, {treatment} at {location}. {business}',req,'Soul Lifting Therapies'))
      .toBe('Hi Sam, Aromatherapy full body massage at Horncastle. Soul Lifting Therapies');
  });
  it('leaves a blank for Emma to choose the place when the customer said either',()=>{
    expect(fillReply('at {location}',{...req,location:'Either'},'x')).toBe('at [Horncastle or Woodhall Spa]');
  });
  it('turns UK numbers into WhatsApp format',()=>{
    expect(waNumber('07700 900123')).toBe('447700900123');
    expect(waNumber('+44 7700 900123')).toBe('447700900123');
    expect(waNumber('0044 7700 900123')).toBe('447700900123');
    expect(waNumber('123')).toBeNull();
  });
  it('builds WhatsApp, text and email links with the message',()=>{
    const l=replyLinks(req,'Hi & thanks','Your request');
    expect(l.whatsapp).toBe('https://wa.me/447700900123?text=Hi%20%26%20thanks');
    expect(l.sms).toBe('sms:07700900123?&body=Hi%20%26%20thanks');
    expect(l.email).toContain('mailto:sam@example.com?subject=Your%20request');
    expect(replyLinks({...req,email:null},'x','y').email).toBeNull();
  });
  it('keeps the treatment name when there is no price in brackets',()=>{
    expect(shortTreatment('Reiki')).toBe('Reiki');
  });
});
