import {describe,it,expect} from 'vitest';
import {makeVoucherCode,codePrefix,expiryFrom,poundsToPennies,formatPounds,safePayLink} from '../lib/vouchers';
import {fillReply,formatWhen,depositLine} from '../lib/reply';
import {withDefaults} from '../lib/site-content';

const req={name:'Jane Smith',treatment:'Facial (£45, 45 minutes)',location:'Horncastle',phone:'07700 900123',email:'jane@example.test'};

describe('vouchers',()=>{
  it('makes readable codes with a business prefix',()=>{
    expect(codePrefix('Soul Lifting Therapies')).toBe('SLT');
    expect(codePrefix('Glow')).toBe('GIFT');
    const code=makeVoucherCode('Soul Lifting Therapies');
    expect(code).toMatch(/^SLT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(code.slice(4)).not.toMatch(/[01IO]/);
  });
  it('sets an expiry in months, or none',()=>{
    expect(expiryFrom(new Date('2026-11-26T10:00:00Z'),12)).toBe('2027-11-26');
    expect(expiryFrom(new Date('2026-11-26T10:00:00Z'),6)).toBe('2027-05-26');
    expect(expiryFrom(new Date(),0)).toBeNull();
    expect(expiryFrom(new Date(),undefined)).toBeNull();
  });
  it('reads pound amounts safely',()=>{
    expect(poundsToPennies('£25')).toBe(2500);
    expect(poundsToPennies('25.5')).toBe(2550);
    expect(poundsToPennies('1,000')).toBe(100000);
    expect(poundsToPennies('-5')).toBeNull();
    expect(poundsToPennies('abc')).toBeNull();
    expect(poundsToPennies('0')).toBeNull();
    expect(formatPounds(2500)).toBe('£25');
    expect(formatPounds(2550)).toBe('£25.50');
  });
  it('only accepts https payment links',()=>{
    expect(safePayLink('https://pay.sumup.com/b2c/X123')).toBe('https://pay.sumup.com/b2c/X123');
    expect(safePayLink('http://example.com')).toBeNull();
    expect(safePayLink('javascript:alert(1)')).toBeNull();
    expect(safePayLink('')).toBeNull();
    expect(safePayLink(undefined)).toBeNull();
  });
});

describe('appointment wording',()=>{
  it('formats times in UK time, including across the clock change',()=>{
    expect(formatWhen('2026-12-02T10:30:00Z')).toBe('Wednesday 2 December at 10:30');
    expect(formatWhen('2026-07-01T09:00:00Z')).toBe('Wednesday 1 July at 10:00');
    expect(formatWhen('not a date')).toBe('');
  });
  it('adds a deposit sentence only when there is a link',()=>{
    expect(depositLine({})).toBe('');
    expect(depositLine({depositLink:'https://pay.example/x',depositAmount:'£10'})).toBe('To hold your slot, please pay the £10 deposit here: https://pay.example/x');
  });
  it('fills the confirmation template',()=>{
    const t=withDefaults().replyConfirm!;
    const out=fillReply(t,req,'Soul Lifting Therapies','',{when:formatWhen('2026-12-02T10:30:00Z'),deposit:'Pay here.'});
    expect(out).toContain('Hi Jane');
    expect(out).toContain('Facial on Wednesday 2 December at 10:30 at Horncastle');
    expect(out).toContain('Pay here. See you then');
    const noDeposit=fillReply(t,req,'Soul Lifting Therapies','',{when:'Monday at 9'});
    expect(noDeposit).not.toContain('{deposit}');
    expect(fillReply(t,req,'X')).toContain('[day and time]');
  });
});

describe('new content fields stay backward compatible',()=>{
  it('old stored content gets safe defaults',()=>{
    const c=withDefaults({businessName:'Old'} as never);
    expect(c.bookingMode).toBe('request');
    expect(c.vouchersEnabled).toBe(false);
    expect(c.voucherOptions).toEqual([]);
    expect(c.remindersEnabled).toBe(true);
    expect(c.voucherExpiryMonths).toBe(12);
  });
});
