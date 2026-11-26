// Spreadsheet import for any till, booking or bank system: read a CSV, let the
// business say which columns are the date, amount and description, and turn the
// rows into money entries. Pure functions, tested on their own.

export function parseCsv(text:string):string[][]{
  const rows:string[][]=[];let row:string[]=[];let cell='';let q=false;
  const t=text.replace(/^﻿/,'');
  for(let i=0;i<t.length;i++){
    const ch=t[i];
    if(q){
      if(ch==='"'&&t[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')q=false;
      else cell+=ch;
    }else if(ch==='"')q=true;
    else if(ch===','||ch===';'&&!t.slice(0,200).includes(',')){row.push(cell);cell=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;row.push(cell);if(row.some(c=>c.trim()!==''))rows.push(row);row=[];cell=''}
    else cell+=ch;
  }
  row.push(cell);if(row.some(c=>c.trim()!==''))rows.push(row);
  return rows;
}

// UK-first dates: 31/12/2025, 31-12-25, 2025-12-31, 31 Dec 2025.
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export function parseDate(s:string):string|null{
  const v=s.trim();let m;
  if((m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return iso(+m[1],+m[2],+m[3]);
  if((m=v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)))return iso(m[3].length===2?2000+ +m[3]:+m[3],+m[2],+m[1]);
  if((m=v.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/))){const mo=MONTHS.indexOf(m[2].toLowerCase());if(mo>=0)return iso(+m[3],mo+1,+m[1])}
  return null;
}
function iso(y:number,mo:number,d:number){if(mo<1||mo>12||d<1||d>31||y<2000||y>2100)return null;return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`}

// "£1,234.50", "-12.00", "(12.00)", "12.00 CR" → pence, keeping the sign.
export function parseAmount(s:string):number|null{
  let v=s.trim();if(!v)return null;
  let neg=false;
  if(/^\(.*\)$/.test(v)){neg=true;v=v.slice(1,-1)}
  if(/\bDR\b/i.test(v))neg=true;
  v=v.replace(/\b(CR|DR|GBP)\b/gi,'').replace(/[£,\s]/g,'');
  if(v.startsWith('-')){neg=!neg;v=v.slice(1)}
  if(!/^\d+(\.\d{1,2})?$/.test(v))return null;
  const p=Math.round(parseFloat(v)*100);
  return neg?-p:p;
}

export type Mapping={date:number;amount?:number;moneyIn?:number;moneyOut?:number;description?:number;hasHeader:boolean;
  // When there is one amount column: what a positive number means.
  positiveIs:'in'|'out';category:string};
export type ImportRow={kind:'in'|'out';amount_pennies:number;occurred_on:string;description:string|null;category:string};

export function mapRows(rows:string[][],m:Mapping):{ok:ImportRow[];skipped:number}{
  const ok:ImportRow[]=[];let skipped=0;
  for(const r of (m.hasHeader?rows.slice(1):rows)){
    const date=parseDate(r[m.date]??'');
    let pence:number|null=null;let kind:'in'|'out'='in';
    if(m.amount!==undefined){
      const a=parseAmount(r[m.amount]??'');
      if(a!==null&&a!==0){pence=Math.abs(a);kind=(a>0)===(m.positiveIs==='in')?'in':'out'}
    }else{
      const i=m.moneyIn!==undefined?parseAmount(r[m.moneyIn]??''):null,o=m.moneyOut!==undefined?parseAmount(r[m.moneyOut]??''):null;
      if(i){pence=Math.abs(i);kind='in'}else if(o){pence=Math.abs(o);kind='out'}
    }
    if(!date||!pence){skipped++;continue}
    ok.push({kind,amount_pennies:pence,occurred_on:date,description:m.description!==undefined?(r[m.description]??'').trim().slice(0,200)||null:null,category:m.category||(kind==='in'?'Takings':'Other')});
  }
  return {ok,skipped};
}

export function toCsv(rows:(string|number|null)[][]):string{
  return rows.map(r=>r.map(c=>{const s=c===null?'':String(c);return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}).join(',')).join('\r\n')+'\r\n';
}
