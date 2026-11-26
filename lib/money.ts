// Emma's money: takings in, costs out, margins per treatment and monthly cashflow.
// Pure calculations only (no database), so they can be tested on their own.
// All amounts are whole pence.

export type MoneyEntry={id:number;kind:'in'|'out';source:string;amount_pennies:number;fee_pennies:number;occurred_on:string;category:string;description:string|null};
export type FixedCost={name:string;monthly_pennies:number};

// "£45", "£45.50", "from £30" → pence. Null when there is no price to read.
export function pricePennies(price:string):number|null{
  const m=price.replace(/,/g,'').match(/£\s*(\d+(?:\.\d{1,2})?)/)||price.match(/(\d+(?:\.\d{1,2})?)/);
  return m?Math.round(parseFloat(m[1])*100):null;
}
// "1 hour 30 minutes", "45 minutes", "1 hour" → minutes.
export function durationMinutes(d:string):number|null{
  const h=d.match(/(\d+(?:\.\d+)?)\s*h/i), m=d.match(/(\d+)\s*m/i);
  const total=(h?parseFloat(h[1])*60:0)+(m?parseInt(m[1],10):0);
  return total>0?Math.round(total):null;
}

export type MarginRow={category:string;name:string;price:number|null;cost:number|null;margin:number|null;marginPct:number|null;perHour:number|null};
// Margin per treatment from the price list and the product cost Emma enters.
// Her time is not a cost here; "per hour" shows what each hour earns after products.
export function treatmentMargins(categories:{name:string;services:{name:string;price:string;duration:string;hidden?:boolean}[]}[],costs:Record<string,number>):MarginRow[]{
  return categories.flatMap(c=>c.services.filter(s=>!s.hidden).map(s=>{
    const price=pricePennies(s.price), cost=costs[costKey(c.name,s.name)]??null, mins=durationMinutes(s.duration);
    const margin=price!==null&&cost!==null?price-cost:null;
    return {category:c.name,name:s.name,price,cost,margin,
      marginPct:margin!==null&&price?Math.round(margin/price*100):null,
      perHour:margin!==null&&mins?Math.round(margin*60/mins):null};
  }));
}
export const costKey=(category:string,name:string)=>`${category}::${name}`;

export type MonthRow={month:string;takings:number;fees:number;costs:number;net:number};
// Month by month: money in, card fees, other costs, and what is left.
export function monthlyCashflow(entries:MoneyEntry[],months=12,now=new Date()):MonthRow[]{
  const keys:string[]=[];
  for(let i=months-1;i>=0;i--){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,1));keys.push(d.toISOString().slice(0,7))}
  const rows=new Map(keys.map(k=>[k,{month:k,takings:0,fees:0,costs:0,net:0}]));
  for(const e of entries){
    const r=rows.get(e.occurred_on.slice(0,7));if(!r)continue;
    if(e.kind==='in'){r.takings+=e.amount_pennies;r.fees+=e.fee_pennies}
    else if(e.category==='Card fees')r.fees+=e.amount_pennies;
    else r.costs+=e.amount_pennies;
  }
  for(const r of rows.values())r.net=r.takings-r.fees-r.costs;
  return [...rows.values()];
}

export type Forecast={avgTakings:number;fixed:number;expectedNet:number;basis:number};
// A plain forecast: average takings over the last full months with any takings,
// less her fixed monthly costs. Labelled as an estimate on the desk.
export function forecast(rows:MonthRow[],fixed:FixedCost[]):Forecast{
  const past=rows.slice(0,-1).filter(r=>r.takings>0).slice(-3);
  const avg=past.length?Math.round(past.reduce((n,r)=>n+r.takings-r.fees,0)/past.length):0;
  const fx=fixed.reduce((n,f)=>n+f.monthly_pennies,0);
  return {avgTakings:avg,fixed:fx,expectedNet:avg-fx,basis:past.length};
}

// SumUp transaction → a money entry. Only finished payments and refunds count.
export type SumUpTx={transaction_code:string;amount:number;currency:string;status:string;type:string;timestamp:string;payment_type?:string;product_summary?:string|null};
export function fromSumUp(t:SumUpTx):{kind:'in'|'out';amount_pennies:number;occurred_on:string;description:string;external_id:string;category:string}|null{
  if(t.currency!=='GBP')return null;
  const pence=Math.round(t.amount*100);
  if(t.type==='PAYMENT'&&(t.status==='SUCCESSFUL'||t.status==='REFUNDED'))
    return {kind:'in',amount_pennies:pence,occurred_on:t.timestamp.slice(0,10),description:t.product_summary||`SumUp ${t.payment_type??'payment'}`,external_id:`sumup:${t.transaction_code}`,category:'Takings'};
  if(t.type==='REFUND'&&t.status==='SUCCESSFUL')
    return {kind:'out',amount_pennies:Math.abs(pence),occurred_on:t.timestamp.slice(0,10),description:'Refund',external_id:`sumup-refund:${t.transaction_code}`,category:'Refunds'};
  return null;
}
