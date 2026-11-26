'use client';
import {useEffect,useState} from 'react';
import {formatWhen} from '@/lib/reply';

type Today={
  requests:{count:number;latest:{id:number;name:string;treatment:string;location:string;created_at:string}[]};
  rewardsReady:{id:number;name:string;balance:number}[];
  newSignups:{id:number;name:string;created_at:string}[];
  customerCount:number;
  appointments?:{id:number;name:string;treatment:string;location:string;phone:string;at:string}[];
  vouchersWaiting?:number;
  todo:{done:number;total:number;next:string|null};
};
const ago=(iso:string)=>{const m=Math.round((Date.now()-new Date(iso).getTime())/60000);if(m<60)return `${Math.max(1,m)} min ago`;const h=Math.round(m/60);if(h<24)return `${h} hour${h===1?'':'s'} ago`;const d=Math.round(h/24);return `${d} day${d===1?'':'s'} ago`};
const short=(t:string)=>t.replace(/\s*\([^)]*\)\s*$/,'');

// What needs Emma today, on one screen: requests to answer, rewards to hand
// out, who has just joined, and how far the launch list has got.
export default function TodayView({go}:{go:(section:string)=>void}){
  const [d,setD]=useState<Today|null>(null);
  const [err,setErr]=useState('');
  useEffect(()=>{fetch('/api/admin/today').then(r=>r.json()).then(x=>{if(x.error)setErr(x.error);else setD(x)}).catch(()=>setErr('Could not load today'))},[]);
  if(err)return <p className="muted">{err}</p>;
  if(!d)return <p className="muted">Loading…</p>;
  return <div className="today">
    {(d.appointments?.length??0)>0&&<section className="admin-card today-card">
      <header><h2>Booked in</h2><strong>{d.appointments!.length}</strong></header>
      <ul className="today-list">{d.appointments!.map(a=><li key={a.id}><span><b>{formatWhen(a.at)}</b> · {a.name}</span><small>{short(a.treatment)} · <a href={'tel:'+a.phone.replace(/\s/g,'')}>{a.phone}</a></small></li>)}</ul>
      <button type="button" className="today-go" onClick={()=>go('requests')}>Open bookings</button>
    </section>}
    {(d.vouchersWaiting??0)>0&&<section className="admin-card today-card is-urgent">
      <header><h2>Voucher orders to check</h2><strong>{d.vouchersWaiting}</strong></header>
      <p className="muted">Someone started buying a gift voucher. When the payment shows, press Paid to send it.</p>
      <button type="button" className="today-go" onClick={()=>go('vouchers')}>Open vouchers</button>
    </section>}
    <section className={d.requests.count?'admin-card today-card is-urgent':'admin-card today-card'}>
      <header><h2>Requests to answer</h2><strong>{d.requests.count}</strong></header>
      {d.requests.count===0?<p className="muted">Nothing waiting. New requests appear here and are emailed to you.</p>:
        <ul className="today-list">{d.requests.latest.map(r=><li key={r.id}><span><b>{r.name}</b> · {short(r.treatment)}</span><small>{r.location} · {ago(r.created_at)}</small></li>)}</ul>}
      <button type="button" className="today-go" onClick={()=>go('requests')}>{d.requests.count?'Reply now':'Open requests'}</button>
    </section>
    <section className="admin-card today-card">
      <header><h2>Rewards ready</h2><strong>{d.rewardsReady.length}</strong></header>
      {d.rewardsReady.length===0?<p className="muted">No one has a reward waiting.</p>:
        <ul className="today-list">{d.rewardsReady.map(c=><li key={c.id}><span><b>{c.name}</b></span><small>{c.balance} points</small></li>)}</ul>}
      <button type="button" className="today-go ghost" onClick={()=>go('loyalty')}>Loyalty &amp; customers</button>
    </section>
    <section className="admin-card today-card">
      <header><h2>New customers</h2><strong>{d.newSignups.length}</strong></header>
      <p className="muted">{d.newSignups.length?'Signed up in the last two weeks.':`No new sign-ups in the last two weeks. ${d.customerCount} in total.`}</p>
      {d.newSignups.length>0&&<ul className="today-list">{d.newSignups.map(c=><li key={c.id}><span><b>{c.name}</b></span><small>{ago(c.created_at)}</small></li>)}</ul>}
    </section>
    {d.todo.done<d.todo.total&&<section className="admin-card today-card">
      <header><h2>Launch to-do</h2><strong>{d.todo.done}/{d.todo.total}</strong></header>
      <div className="todo-bar"><span style={{width:`${Math.round(d.todo.done/d.todo.total*100)}%`}}/></div>
      {d.todo.next&&<p className="muted">Next: {d.todo.next}</p>}
      <button type="button" className="today-go ghost" onClick={()=>go('todo')}>Carry on</button>
    </section>}
  </div>;
}
