import {describe,it,expect} from 'vitest';
import {pricePennies,durationMinutes,treatmentMargins,monthlyCashflow,forecast,fromSumUp,costKey,type MoneyEntry} from '@/lib/money';

describe('reading the price list',()=>{
  it('reads prices',()=>{expect(pricePennies('£45')).toBe(4500);expect(pricePennies('£45.50')).toBe(4550);expect(pricePennies('from £1,200')).toBe(120000);expect(pricePennies('POA')).toBeNull()});
  it('reads durations',()=>{expect(durationMinutes('1 hour 30 minutes')).toBe(90);expect(durationMinutes('45 minutes')).toBe(45);expect(durationMinutes('1 hour')).toBe(60);expect(durationMinutes('—')).toBeNull()});
});
describe('margins',()=>{
  const cats=[{name:'Facials',services:[{name:'Peel',price:'£60',duration:'45 minutes'},{name:'Old',price:'£10',duration:'10 minutes',hidden:true},{name:'Mask',price:'£30',duration:'30 minutes'}]}];
  it('works out margin, percent and per hour; leaves blanks without a cost; skips hidden',()=>{
    const rows=treatmentMargins(cats,{[costKey('Facials','Peel')]:1200});
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({price:6000,cost:1200,margin:4800,marginPct:80,perHour:6400});
    expect(rows[1]).toMatchObject({cost:null,margin:null});
  });
});
describe('cashflow',()=>{
  const e=(kind:'in'|'out',amt:number,on:string,category='Takings',fee=0):MoneyEntry=>({id:0,kind,source:'manual',amount_pennies:amt,fee_pennies:fee,occurred_on:on,category,description:null});
  const now=new Date('2026-11-26T12:00:00Z');
  it('groups by month into takings, fees, costs and net',()=>{
    const rows=monthlyCashflow([e('in',10000,'2026-11-02'),e('out',300,'2026-11-05','Card fees'),e('out',2000,'2026-11-10','Stock'),e('in',5000,'2026-10-01'),e('in',999,'2025-01-01')],12,now);
    expect(rows).toHaveLength(12);
    expect(rows.at(-1)).toEqual({month:'2026-11',takings:10000,fees:300,costs:2000,net:7700});
    expect(rows.at(-2)?.takings).toBe(5000);
  });
  it('forecasts from recent full months less fixed costs',()=>{
    const rows=monthlyCashflow([e('in',30000,'2026-08-03'),e('in',40000,'2026-09-03'),e('in',50000,'2026-10-03'),e('in',1,'2026-11-01')],12,now);
    expect(forecast(rows,[{name:'Rent',monthly_pennies:15000}])).toEqual({avgTakings:40000,fixed:15000,expectedNet:25000,basis:3});
  });
});
describe('SumUp',()=>{
  const t={transaction_code:'TX1',amount:45.5,currency:'GBP',status:'SUCCESSFUL',type:'PAYMENT',timestamp:'2026-11-20T10:00:00Z',payment_type:'POS',product_summary:null};
  it('turns a card payment into takings',()=>{expect(fromSumUp(t)).toMatchObject({kind:'in',amount_pennies:4550,occurred_on:'2026-11-20',external_id:'sumup:TX1'})});
  it('records refunds as money out and ignores failed ones',()=>{
    expect(fromSumUp({...t,type:'REFUND',amount:-10})).toMatchObject({kind:'out',amount_pennies:1000,category:'Refunds'});
    expect(fromSumUp({...t,status:'FAILED'})).toBeNull();
  });
});
