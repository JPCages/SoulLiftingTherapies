'use client';
import Image from 'next/image';
import type {SiteContent} from '@/lib/site-content';

// The same footer on every page. On the app-style pages (treatments, account)
// it is hidden on phones, where the fixed bottom nav already does this job.
export default function SiteFooter({content,desktopOnly=false}:{content:SiteContent;desktopOnly?:boolean}){
  const c=content;
  return <footer className={desktopOnly?'lux-foot home-foot-desk':'lux-foot'}>
    <div className="lux-in">
      <div className="lux-foot-cols">
        <div className="lux-foot-brand">
          <span className="lux-foot-mark"><Image src="/brand/mark-lotus.webp" alt="" width={96} height={96}/><b>{c.businessName}</b></span>
          <span className="lux-label lux-label-light">{c.descriptor}</span>
        </div>
        {c.horncastle&&<div><span className="lux-foot-h">Horncastle</span><span>{c.horncastle}</span></div>}
        {c.woodhall&&<div><span className="lux-foot-h">Woodhall Spa</span><span>{c.woodhall}</span></div>}
        <div><span className="lux-foot-h">Get in touch</span>
          {c.phone&&<a href={`tel:${c.phone.replace(/\s/g,'')}`}>{c.phone}</a>}
          {c.email&&<a href={`mailto:${c.email}`}>{c.email}</a>}
          {c.vouchersEnabled&&<a href="/vouchers">Gift vouchers</a>}
        </div>
      </div>
      <div className="lux-foot-base"><span>© {new Date().getFullYear()} {c.businessName}</span></div>
    </div>
  </footer>;
}
