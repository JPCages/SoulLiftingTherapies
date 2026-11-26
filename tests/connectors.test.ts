import {describe,it,expect,beforeAll} from 'vitest';
import {seal,open,signState,checkState} from '@/lib/connectors/crypto';
import {fromStripe} from '@/lib/connectors/providers/stripe';
import {fromSquare} from '@/lib/connectors/providers/square';
import {fromZettle} from '@/lib/connectors/providers/zettle';
import {fromXero,xeroDate} from '@/lib/connectors/providers/xero';
import {fromQuickBooks} from '@/lib/connectors/providers/quickbooks';
import {fromFreeAgent} from '@/lib/connectors/providers/freeagent';
import {fromSage} from '@/lib/connectors/providers/sage';
import {PROVIDERS} from '@/lib/connectors/registry';
import {parseCsv,parseDate,parseAmount,mapRows,toCsv} from '@/lib/csv';

beforeAll(()=>{process.env.CONNECTOR_SECRET='test-secret-that-is-at-least-32-characters-long'});

describe('sealed connection details',()=>{
  it('round-trips and cannot be read or altered without the key',()=>{
    const s=seal({access_token:'abc',refresh_token:'def'});
    expect(s).not.toContain('abc');
    expect(open(s)).toEqual({access_token:'abc',refresh_token:'def'});
    const parts=s.split('.');parts[3]=Buffer.from('tampered').toString('base64');
    expect(()=>open(parts.join('.'))).toThrow();
  });
  it('state only checks out for the same request, provider and time window',()=>{
    const st=signState('xero','n1',1000);
    expect(checkState(st,'n1',15*60*1000,2000)).toBe('xero');
    expect(checkState(st,'other',15*60*1000,2000)).toBeNull();
    expect(checkState(st,'n1',15*60*1000,1000+16*60*1000)).toBeNull();
    expect(checkState(st.replace('xero','sage'),'n1',15*60*1000,2000)).toBeNull();
  });
});

describe('payment adapters',()=>{
  it('Stripe: charge in, its fee out, refunds out, payouts ignored',()=>{
    expect(fromStripe({id:'t1',amount:5000,fee:145,currency:'gbp',type:'charge',created:1764000000})).toEqual([
      expect.objectContaining({kind:'in',amount_pennies:5000,category:'Takings'}),
      expect.objectContaining({kind:'out',amount_pennies:145,category:'Card fees'})]);
    expect(fromStripe({id:'t2',amount:-2000,fee:0,currency:'gbp',type:'refund',created:1764000000})[0]).toMatchObject({kind:'out',amount_pennies:2000});
    expect(fromStripe({id:'t3',amount:-9000,fee:0,currency:'gbp',type:'payout',created:1764000000})).toEqual([]);
    expect(fromStripe({id:'t4',amount:100,fee:0,currency:'usd',type:'charge',created:1764000000})).toEqual([]);
  });
  it('Square: completed payments with fees and refunds; others skipped',()=>{
    const r=fromSquare({id:'p1',status:'COMPLETED',created_at:'2026-11-01T10:00:00Z',amount_money:{amount:4500,currency:'GBP'},processing_fee:[{amount_money:{amount:79,currency:'GBP'}}],refunded_money:{amount:1000,currency:'GBP'}});
    expect(r.map(e=>[e.kind,e.amount_pennies,e.category])).toEqual([['in',4500,'Takings'],['out',79,'Card fees'],['out',1000,'Refunds']]);
    expect(fromSquare({id:'p2',status:'FAILED',created_at:'2026-11-01T10:00:00Z',amount_money:{amount:1,currency:'GBP'}})).toEqual([]);
  });
  it('Zettle: sales in, refunds out (minor units)',()=>{
    expect(fromZettle({purchaseUUID1:'u1',amount:995,currency:'GBP',timestamp:'2026-11-02T17:05:06.123+0000'})).toMatchObject({kind:'in',amount_pennies:995,occurred_on:'2026-11-02'});
    expect(fromZettle({purchaseUUID1:'u2',amount:-995,currency:'GBP',timestamp:'2026-11-02T17:05:06.123+0000',refund:true})).toMatchObject({kind:'out',amount_pennies:995});
  });
});

describe('accounting adapters bring in costs only',()=>{
  it('Xero spend and bills, skipping drafts and voids; reads Xero dates',()=>{
    expect(xeroDate('/Date(1764547200000+0000)/')).toBe('2025-12-01');
    expect(fromXero({BankTransactionID:'b1',Total:35.5,Date:'2026-11-03T00:00:00',Status:'AUTHORISED',Contact:{Name:'Lycon UK'}},'spend')).toMatchObject({kind:'out',amount_pennies:3550,occurred_on:'2026-11-03',description:'Lycon UK'});
    expect(fromXero({InvoiceID:'i1',Total:10,Date:'2026-11-03',Status:'DRAFT'},'bill')).toBeNull();
  });
  it('QuickBooks purchases and bills',()=>{
    expect(fromQuickBooks({Id:'7',TotalAmt:120,TxnDate:'2026-10-01',VendorRef:{name:'Landlord'}},'bill')).toMatchObject({kind:'out',amount_pennies:12000,description:'Landlord',external_id:'qbo-bill:7'});
  });
  it('FreeAgent bills; refund bills come in as money back',()=>{
    expect(fromFreeAgent({url:'https://api.freeagent.com/v2/bills/9',dated_on:'2026-10-05',total_value:'48.00'})).toMatchObject({kind:'out',amount_pennies:4800});
    expect(fromFreeAgent({url:'https://api.freeagent.com/v2/bills/10',dated_on:'2026-10-05',total_value:'-5.00'})).toMatchObject({kind:'in',amount_pennies:500});
  });
  it('Sage purchase invoices and payments out (not receipts)',()=>{
    expect(fromSage({id:'s1',date:'2026-09-09',total_amount:'60.00',contact:{displayed_as:'Insurer'}},'invoice')).toMatchObject({kind:'out',amount_pennies:6000,description:'Insurer'});
    expect(fromSage({id:'s2',date:'2026-09-09',total_amount:20,transaction_type:{id:'OTHER_RECEIPT'}},'payment')).toBeNull();
  });
});

describe('every provider is complete',()=>{
  it('has a sync and either a key flow with steps or a sign-in flow with app details',()=>{
    for(const p of PROVIDERS){
      expect(typeof p.sync).toBe('function');
      if(p.auth==='apikey'){expect(p.connectKey).toBeTypeOf('function');expect(p.keySteps?.length).toBeGreaterThan(0)}
      else{expect(p.authorizeUrl).toBeTypeOf('function');expect(p.exchangeCode).toBeTypeOf('function');expect(p.envNames?.length).toBe(2)}
    }
  });
});

describe('spreadsheet import',()=>{
  it('reads quoted CSV, UK dates and amounts',()=>{
    expect(parseCsv('Date,Amount,Note\r\n01/11/2026,"£1,234.50","Card, till"\n')).toEqual([['Date','Amount','Note'],['01/11/2026','£1,234.50','Card, till']]);
    expect(parseDate('31/12/2025')).toBe('2025-12-31');expect(parseDate('2026-01-02')).toBe('2026-01-02');expect(parseDate('3 Feb 2026')).toBe('2026-02-03');expect(parseDate('13/13/2026')).toBeNull();
    expect(parseAmount('(12.00)')).toBe(-1200);expect(parseAmount('-£5')).toBe(-500);expect(parseAmount('abc')).toBeNull();
  });
  it('maps one signed amount column or separate in/out columns, skipping bad rows',()=>{
    const rows=[['Date','Amount','Desc'],['01/11/2026','45.00','Facial'],['02/11/2026','-12.50','Wax'],['bad','1','x'],['03/11/2026','','y']];
    const r=mapRows(rows,{date:0,amount:1,description:2,hasHeader:true,positiveIs:'in',category:''});
    expect(r.skipped).toBe(2);
    expect(r.ok.map(x=>[x.kind,x.amount_pennies,x.occurred_on,x.description])).toEqual([['in',4500,'2026-11-01','Facial'],['out',1250,'2026-11-02','Wax']]);
    const two=mapRows([['05/11/2026','','30']],{date:0,moneyIn:1,moneyOut:2,hasHeader:false,positiveIs:'in',category:'Stock & products'});
    expect(two.ok[0]).toMatchObject({kind:'out',amount_pennies:3000,category:'Stock & products'});
  });
  it('writes CSV safely',()=>{expect(toCsv([['a','b,c','say "hi"']])).toBe('a,"b,c","say ""hi"""\r\n')});
});
