// No 0/O, 1/I/L: codes get read out over the phone and typed from a card.
const ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// "Soul Lifting Therapies" → "SLT". Any business gets its own prefix.
export function codePrefix(business:string):string{
  const p=business.split(/\s+/).map(w=>w.replace(/[^A-Za-z]/g,'')[0]||'').join('').toUpperCase().slice(0,4);
  return p.length>=2?p:'GIFT';
}

// Works on the server and in the browser (Web Crypto). 2^32 % 31 bias is negligible.
const randomInt=(n:number)=>{const a=new Uint32Array(1);globalThis.crypto.getRandomValues(a);return a[0]%n};

export function makeVoucherCode(business:string,rand:(n:number)=>number=randomInt):string{
  const part=()=>Array.from({length:4},()=>ALPHABET[rand(ALPHABET.length)]).join('');
  return `${codePrefix(business)}-${part()}-${part()}`;
}

// The expiry date, as YYYY-MM-DD, a number of months from the given day.
// 0 or less means the voucher does not expire.
export function expiryFrom(from:Date,months:number|undefined):string|null{
  if(!months||months<=0)return null;
  const d=new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth()+Math.round(months),from.getUTCDate()));
  return d.toISOString().slice(0,10);
}

// "£25", "25", "25.50" → pennies; anything else → null.
export function poundsToPennies(v:unknown):number|null{
  const s=String(v??'').replace(/[£,\s]/g,'');
  if(!/^\d+(\.\d{1,2})?$/.test(s))return null;
  const p=Math.round(parseFloat(s)*100);
  return p>0&&p<=1_000_000?p:null;
}

export const formatPounds=(p:number)=>'£'+(p%100===0?(p/100).toString():(p/100).toFixed(2));

// Only an https link to a payment page is allowed as a "buy" link.
export function safePayLink(link:string|undefined):string|null{
  try{const u=new URL((link||'').trim());return u.protocol==='https:'?u.toString():null}catch{return null}
}
