'use client';
import {useEffect,useState} from 'react';
import type {SiteContent} from '@/lib/site-content';
import {formatPounds,safePayLink} from '@/lib/vouchers';

type Voucher={id:number;code:string|null;amount_pennies:number;balance_pennies:number;buyer_name:string;buyer_email:string|null;recipient_name:string|null;message:string|null;status:'pending'|'issued'|'void';created_at:string;expires_on:string|null};
type Course={id:number;customer_id:number|null;person_name:string;title:string;sessions_total:number;sessions_used:number;note:string|null;expires_on:string|null};
type Customer={id:number;name:string;email:string};
type Option={label:string;amount:number;link:string};
const day=(d:string)=>new Date(d.length===10?d+'T12:00:00Z':d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const post=async(url:string,body:object)=>{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {ok:r.ok,out:await r.json().catch(()=>({}))}};

// Gift vouchers and courses: the two things salons usually pay a booking system
// extra for. Vouchers are sold with the salon's own payment links; courses are a
// number of sessions ticked off visit by visit.
export default function VouchersCourses({content,onSavePatch}:{content:SiteContent;onSavePatch:(p:Partial<SiteContent>)=>Promise<unknown>}){
  const [vouchers,setVouchers]=useState<Voucher[]>([]);
  const [courses,setCourses]=useState<Course[]>([]);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [msg,setMsg]=useState('');
  const [cMsg,setCMsg]=useState('');
  const [setMsgText,setSetMsg]=useState('');
  // Settings are edited here and saved together.
  const [on,setOn]=useState(content.vouchersEnabled===true);
  const [options,setOptions]=useState<Option[]>(content.voucherOptions??[]);
  const [intro,setIntro]=useState(content.voucherIntro??'');
  const [terms,setTerms]=useState(content.voucherTerms??'');
  const [months,setMonths]=useState(String(content.voucherExpiryMonths??12));
  const [code,setCode]=useState('');const [amount,setAmount]=useState('');
  const [found,setFound]=useState<Voucher|null>(null);
  const [sell,setSell]=useState({name:'',email:'',recipient:'',amount:'',notify:true});
  const [course,setCourse]=useState({name:'',customerId:'',title:'',sessions:'6',expires:''});

  const load=()=>Promise.all([
    fetch('/api/admin/vouchers').then(r=>r.json()).then(d=>setVouchers(d.vouchers||[])),
    fetch('/api/admin/courses').then(r=>r.json()).then(d=>setCourses(d.courses||[])),
  ]).catch(()=>{});
  useEffect(()=>{load();fetch('/api/admin/customers').then(r=>r.json()).then(d=>setCustomers(d.customers||[])).catch(()=>{})},[]);

  const badLinks=options.filter(o=>o.amount>0&&!safePayLink(o.link)).length;
  async function saveSettings(){
    const clean=options.filter(o=>o.amount>0).map(o=>({label:o.label.trim(),amount:Math.round(o.amount*100)/100,link:o.link.trim()}));
    if(on&&!clean.some(o=>safePayLink(o.link))){setSetMsg('Add at least one voucher with a payment link (starting https://) before switching vouchers on.');return}
    setSetMsg('Saving…');
    await onSavePatch({vouchersEnabled:on,voucherOptions:clean,voucherIntro:intro,voucherTerms:terms,voucherExpiryMonths:Math.max(0,Math.round(Number(months)||0))});
    setSetMsg('Saved and live.');
  }
  async function act(body:object,done:string){
    setMsg('Working…');
    const {ok,out}=await post('/api/admin/vouchers',body);
    if(!ok){setMsg(out.error||'That did not work.');return null}
    const mail=out.emailed==='sent'?' Emailed to the buyer.':out.emailed==='failed'?' The email did not send: give them the code yourself.':'';
    setMsg(done+(out.voucher?.code?` Code ${out.voucher.code}.`:'')+mail);load();return out;
  }
  async function check(){const {ok,out}=await post('/api/admin/vouchers',{action:'check',code});setFound(ok?out.voucher:null);setMsg(ok?'':out.error)}
  async function redeem(){const out=await act({action:'redeem',code,amount},'Taken off.');if(out)setFound(out.voucher)}
  async function addCourse(){
    setCMsg('Saving…');
    const cust=customers.find(c=>String(c.id)===course.customerId);
    const {ok,out}=await post('/api/admin/courses',{action:'create',name:cust?.name||course.name,customerId:course.customerId||null,title:course.title,sessions:Number(course.sessions),expires:course.expires});
    if(!ok){setCMsg(out.error||'Could not add that.');return}
    setCMsg(cust?`Added. ${cust.name} can see it on their account.`:'Added.');setCourse({name:'',customerId:'',title:'',sessions:'6',expires:''});load();
  }
  async function tickSession(id:number,undo=false){const {ok,out}=await post('/api/admin/courses',{action:undo?'undo':'use',id});setCMsg(ok?'':out.error);load()}

  const pending=vouchers.filter(v=>v.status==='pending');
  const live=vouchers.filter(v=>v.status==='issued');
  const outstanding=live.reduce((s,v)=>s+v.balance_pennies,0);

  return <>
    <div className="admin-card"><h2>Use a voucher</h2>
      <p className="hint">Type the code from the customer&rsquo;s voucher, check what is left, then take off the cost of today&rsquo;s treatment. Anything left over stays on the voucher.</p>
      <div className="inline-form"><input aria-label="Voucher code" placeholder="Code, e.g. SLT-AB2C-D3EF" value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setFound(null)}}/><button type="button" className="img-btn" onClick={check} disabled={!code.trim()}>Check</button></div>
      {found&&<p className="voucher-found"><b>{found.code}</b> · {formatPounds(found.balance_pennies)} left of {formatPounds(found.amount_pennies)}{found.recipient_name?` · for ${found.recipient_name}`:''}{found.expires_on?` · until ${day(found.expires_on)}`:''}{found.status!=='issued'?` · ${found.status==='void'?'cancelled':'not paid yet'}`:''}</p>}
      {found?.status==='issued'&&found.balance_pennies>0&&<div className="inline-form"><input aria-label="Amount to take off" placeholder="£ amount" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/><button type="button" className="img-btn" onClick={redeem} disabled={!amount}>Take it off</button></div>}
      <p className="cust-msg">{msg}</p>
    </div>

    {pending.length>0&&<div className="admin-card"><h2>Waiting for payment ({pending.length})</h2><p className="hint">Someone started buying these online. When the money shows in your payment account, press Paid and the voucher is emailed to them with its code.</p>
      <ul className="voucher-list">{pending.map(v=><li key={v.id}><span><b>{formatPounds(v.amount_pennies)}</b> from {v.buyer_name}{v.recipient_name?` for ${v.recipient_name}`:''}<small>{v.buyer_email} · {day(v.created_at)}</small></span><span className="voucher-acts"><button type="button" className="img-btn" onClick={()=>act({action:'issue',id:v.id},'Voucher issued.')}>Paid - send voucher</button><button type="button" className="img-btn ghost" onClick={()=>{if(confirm('Cancel this voucher order?'))act({action:'void',id:v.id},'Cancelled.')}}>Cancel</button></span></li>)}</ul></div>}

    <div className="admin-card admin-fields"><h2 className="wide">Sell one in person</h2>
      <label>Buyer&rsquo;s name<input value={sell.name} onChange={e=>setSell({...sell,name:e.target.value})}/></label>
      <label>Amount (£)<input inputMode="decimal" value={sell.amount} onChange={e=>setSell({...sell,amount:e.target.value})}/></label>
      <label>Who it is for <span className="optional">(optional)</span><input value={sell.recipient} onChange={e=>setSell({...sell,recipient:e.target.value})}/></label>
      <label>Buyer&rsquo;s email <span className="optional">(optional)</span><input type="email" value={sell.email} onChange={e=>setSell({...sell,email:e.target.value})}/></label>
      {sell.email&&<label className="wide toggle"><input type="checkbox" checked={sell.notify} onChange={e=>setSell({...sell,notify:e.target.checked})}/> Email them the voucher</label>}
      <div className="wide"><button type="button" onClick={async()=>{const o=await act({action:'sell',...sell},'Voucher made.');if(o)setSell({name:'',email:'',recipient:'',amount:'',notify:true})}} disabled={!sell.name||!sell.amount}>Make voucher</button></div>
      <p className="hint wide">Take the payment as you normally do. This gives you a code to write on a card, and keeps track of what is left on it.</p>
    </div>

    <div className="admin-card"><h2>Vouchers in use</h2><p className="hint">{live.length} vouchers · {formatPounds(outstanding)} still to be spent with you.</p>
      {live.length===0?<p className="muted">None yet.</p>:<ul className="voucher-list">{live.map(v=><li key={v.id}><span><b>{v.code}</b> · {formatPounds(v.balance_pennies)} left of {formatPounds(v.amount_pennies)}<small>{v.buyer_name}{v.recipient_name?` for ${v.recipient_name}`:''}{v.expires_on?` · until ${day(v.expires_on)}`:''}</small></span></li>)}</ul>}
    </div>

    <div className="admin-card admin-fields"><h2 className="wide">Selling vouchers on your website</h2>
      <label className="wide toggle"><input type="checkbox" checked={on} onChange={e=>setOn(e.target.checked)}/> Show the Gift vouchers page on the website</label>
      <p className="hint wide">For each amount, make a payment link in your card provider (in SumUp: Payment links, set the amount, copy the link) and paste it here. Customers pay you directly; this site never sees card details.</p>
      {options.map((o,i)=><div className="voucher-option wide" key={i}>
        <label>Amount (£)<input inputMode="decimal" value={o.amount||''} onChange={e=>setOptions(x=>x.map((y,j)=>j===i?{...y,amount:Number(e.target.value)||0}:y))}/></label>
        <label>Label <span className="optional">(optional)</span><input placeholder="e.g. Any facial" value={o.label} onChange={e=>setOptions(x=>x.map((y,j)=>j===i?{...y,label:e.target.value}:y))}/></label>
        <label className="wide-ish">Payment link<input placeholder="https://..." value={o.link} onChange={e=>setOptions(x=>x.map((y,j)=>j===i?{...y,link:e.target.value}:y))}/></label>
        <button type="button" className="danger" onClick={()=>setOptions(x=>x.filter((_,j)=>j!==i))}>Remove</button>
      </div>)}
      <div className="wide"><button type="button" className="img-btn ghost" onClick={()=>setOptions(x=>[...x,{label:'',amount:0,link:''}])}>＋ Add an amount</button></div>
      {badLinks>0&&<p className="hint wide alert-off">{badLinks} payment link{badLinks>1?'s do':' does'} not look right. They must start with https://</p>}
      <label className="wide">Introduction<textarea rows={2} value={intro} onChange={e=>setIntro(e.target.value)}/></label>
      <label className="wide">Terms printed on the voucher<textarea rows={2} value={terms} onChange={e=>setTerms(e.target.value)}/></label>
      <label>Vouchers last (months, 0 = no expiry)<input inputMode="numeric" value={months} onChange={e=>setMonths(e.target.value)}/></label>
      <div className="wide alert-actions"><button type="button" onClick={saveSettings}>Save &amp; publish</button><span className="cust-msg">{setMsgText}</span></div>
    </div>

    <div className="admin-card admin-fields" id="courses"><h2 className="wide">Courses</h2>
      <p className="hint wide">A course is a set of sessions paid for together, like 6 laser sessions. Add it here, then tick off a session each visit. If they have an account on the app, they can see how many are left.</p>
      <label>Customer with an account<select value={course.customerId} onChange={e=>setCourse({...course,customerId:e.target.value})}><option value="">Not on the app</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}</select></label>
      {!course.customerId&&<label>Their name<input value={course.name} onChange={e=>setCourse({...course,name:e.target.value})}/></label>}
      <label>Course<input placeholder="e.g. 6 x Lymphatic drainage" value={course.title} onChange={e=>setCourse({...course,title:e.target.value})}/></label>
      <label>Sessions<input inputMode="numeric" value={course.sessions} onChange={e=>setCourse({...course,sessions:e.target.value})}/></label>
      <label>Use by <span className="optional">(optional)</span><input type="date" value={course.expires} onChange={e=>setCourse({...course,expires:e.target.value})}/></label>
      <div className="wide alert-actions"><button type="button" onClick={addCourse} disabled={!course.title||(!course.customerId&&!course.name)}>Add course</button><span className="cust-msg">{cMsg}</span></div>
      {courses.length>0&&<ul className="voucher-list wide">{courses.map(c=>{const left=c.sessions_total-c.sessions_used;return <li key={c.id}><span><b>{c.person_name}</b> · {c.title}<small>{left>0?`${left} of ${c.sessions_total} left`:'All used'}{c.expires_on?` · use by ${day(c.expires_on)}`:''}{c.customer_id?' · on the app':''}</small></span><span className="voucher-acts"><button type="button" className="img-btn" disabled={left<=0} onClick={()=>tickSession(c.id)}>Used one today</button><button type="button" className="img-btn ghost" disabled={c.sessions_used<=0} onClick={()=>tickSession(c.id,true)}>Undo</button></span></li>})}</ul>}
    </div>
  </>;
}
