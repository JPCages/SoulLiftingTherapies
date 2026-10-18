'use client';
import Image from 'next/image';
import Link from 'next/link';
import type {SiteContent} from '@/lib/site-content';

// One header for every page. On the app-style pages (treatments, account) it is
// hidden on phones, where those pages keep their own compact app chrome.
// When onSignOut is given the page knows the visitor is signed in, so the
// header offers a way out instead of a way in.
export default function SiteHeader({content,desktopOnly=false,onSignOut}:{content:SiteContent;desktopOnly?:boolean;onSignOut?:()=>void}){
  return <header className={desktopOnly?'sitebar sitebar-desk':'sitebar'}>
    <div className="sitebar-in">
      <Link className="sitemark" href="/" aria-label={content.businessName}>
        <span className="sitemark-coin"><Image src="/brand/mark-lotus.webp" alt="" width={160} height={160}/></span>
        <span className="sitemark-words"><b>{content.businessName}</b><span>{content.descriptor}</span></span>
      </Link>
      <nav className="sitenav" aria-label="Main">
        <Link className="sitenav-link" href="/services">Treatments</Link>
        <Link className="sitenav-link" href="/#how">How booking works</Link>
        <Link className="sitenav-link" href="/#find">Find us</Link>
        {onSignOut
          ? <><Link className="sitenav-link" href="/account">My account</Link><button type="button" className="site-btn line" onClick={onSignOut}>Sign out</button></>
          : <Link className="site-btn line" href="/login">Log in</Link>}
        <Link className="site-btn solid" href="/book">Book</Link>
      </nav>
      <nav className="sitesub" aria-label="Sections">
        <Link href="/services">Treatments</Link>
        <Link href="/#how">How booking works</Link>
        <Link href="/#find">Find us</Link>
      </nav>
    </div>
  </header>;
}
