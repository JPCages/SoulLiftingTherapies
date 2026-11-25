'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {SiteContent} from '@/lib/site-content';

// One header for every page. On the signed-in account page it is hidden on
// phones, where that page keeps its own compact app chrome.
// When onSignOut is given the page knows the visitor is signed in, so the
// header offers a way out instead of a way in.
// overlay: the homepage version, which floats over the full-screen photo and
// turns solid once the visitor scrolls past it.
export default function SiteHeader({content,desktopOnly=false,onSignOut,overlay=false}:{content:SiteContent;desktopOnly?:boolean;onSignOut?:()=>void;overlay?:boolean}){
  const [solid,setSolid]=useState(!overlay);
  const [open,setOpen]=useState(false);
  // Every page asks who is signed in, so a signed-in visitor keeps seeing their
  // account (or Emma her desk) and a way out, wherever they go on the site.
  const [role,setRole]=useState<'admin'|'customer'|null>(onSignOut?'customer':null);
  useEffect(()=>{
    let live=true;
    fetch('/api/auth/me').then(r=>r.ok?r.json():null).then(m=>{if(live&&m)setRole(m.role??null)}).catch(()=>{});
    return ()=>{live=false};
  },[]);
  const signOut=onSignOut??(async()=>{await fetch('/api/auth/logout',{method:'POST'}).catch(()=>{});location.href='/';});
  const home=role==='admin'?{href:'/portal',label:'Your desk'}:{href:'/account',label:'My account'};
  useEffect(()=>{
    if(!overlay)return;
    const on=()=>setSolid(window.scrollY>60);
    on();
    window.addEventListener('scroll',on,{passive:true});
    return ()=>window.removeEventListener('scroll',on);
  },[overlay]);

  const cls=['sitebar',desktopOnly&&'sitebar-desk',overlay&&'sitebar-overlay',overlay&&solid&&'is-solid',open&&'is-open'].filter(Boolean).join(' ');
  const close=()=>setOpen(false);
  return <header className={cls}>
    <div className="sitebar-in">
      <Link className="sitemark" href="/" aria-label={content.businessName} onClick={close}>
        <span className="sitemark-coin"><Image src="/brand/mark-lotus.webp" alt="" width={160} height={160}/></span>
        <span className="sitemark-words"><b>{content.businessName}</b><span>{content.descriptor}</span></span>
      </Link>
      <nav className="sitenav" aria-label="Main">
        <Link className="sitenav-link" href="/services">Treatments</Link>
        <Link className="sitenav-link" href="/#how">How booking works</Link>
        <Link className="sitenav-link" href="/#find">Find us</Link>
        {role
          ? <><Link className="sitenav-link" href={home.href}>{home.label}</Link><button type="button" className="site-btn line" onClick={signOut}>Sign out</button></>
          : <Link className="site-btn line" href="/login">Log in</Link>}
        <Link className="site-btn solid" href="/book">Book</Link>
      </nav>
      <button type="button" className="sitemenu-btn" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{open?<path d="M4 4l12 12M16 4L4 16"/>:<path d="M2 5h16M2 10h16M2 15h16"/>}</svg>
      </button>
    </div>
    {open&&<nav className="sitemenu" aria-label="Menu">
      <Link href="/services" onClick={close}>Treatments</Link>
      <Link href="/#how" onClick={close}>How booking works</Link>
      <Link href="/#find" onClick={close}>Find us</Link>
      {role
        ? <><Link href={home.href} onClick={close}>{home.label}</Link><button type="button" onClick={()=>{close();signOut()}}>Sign out</button></>
        : <Link href="/login" onClick={close}>Log in</Link>}
    </nav>}
  </header>;
}
