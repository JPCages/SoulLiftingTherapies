'use client';
import {FormEvent,useEffect,useState} from 'react';
import {defaultSiteContent,type SiteContent} from '@/lib/site-content';

export default function Login(){
  const [content,setContent]=useState<SiteContent>(defaultSiteContent);
  const [mode,setMode]=useState<'signin'|'register'>('signin');
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{fetch('/api/content').then(r=>r.ok?r.json():null).then(x=>x&&setContent(x)).catch(()=>{})},[]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');
    const data=new FormData(e.currentTarget);
    const endpoint=mode==='register'?'/api/auth/register':'/api/auth/login';
    const body=mode==='register'
      ? {name:data.get('name'),email:data.get('email'),password:data.get('password')}
      : {email:data.get('email'),password:data.get('password')};
    const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const out=await r.json().catch(()=>({}));
    if(r.ok){location.href=out.role==='admin'?'/portal':'/account';return}
    setError(out.error||'Something went wrong. Please try again.');setBusy(false);
  }

  return <main className="login"><a className="back" href="/">← {content.businessName}</a><section>
    <p className="eyebrow">{content.loginEyebrow}</p>
    <h1>{mode==='register'?'Create your account.':content.loginHeading}</h1>
    <p>{mode==='register'?'Set up your private space for appointments, progress and rewards.':content.loginIntro}</p>
    <div className="login-tabs"><button type="button" className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setError('')}}>Sign in</button><button type="button" className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}}>Create account</button></div>
    <form onSubmit={submit}>
      {mode==='register'&&<label>Your name<input name="name" type="text" required autoComplete="name"/></label>}
      <label>Email address<input name="email" type="email" required autoComplete="email"/></label>
      <label>Password<input name="password" type="password" required autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?8:undefined}/></label>
      {error&&<p className="login-error">{error}</p>}
      <button className="primary" disabled={busy}>{busy?'Please wait…':mode==='register'?'Create account':'Sign in'}</button>
    </form>
    <p className="login-switch">{mode==='signin'?<>New here? <button type="button" onClick={()=>{setMode('register');setError('')}}>Create an account</button></>:<>Already have an account? <button type="button" onClick={()=>{setMode('signin');setError('')}}>Sign in</button></>}</p>
  </section></main>;
}
