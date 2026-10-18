'use client';
import type {SiteContent} from '@/lib/site-content';

// The same footer on every page. On the app-style pages (treatments, account)
// it is hidden on phones, where the fixed bottom nav already does this job.
export default function SiteFooter({content,desktopOnly=false}:{content:SiteContent;desktopOnly?:boolean}){
  const c=content;
  return <footer className={desktopOnly?'home-foot home-foot-desk':'home-foot'}>
    <div className="home-in home-foot-in">
      <div><b>{c.businessName}</b>{c.descriptor}</div>
      {c.horncastle&&<div><b>Horncastle</b>{c.horncastle}</div>}
      {c.woodhall&&<div><b>Woodhall Spa</b>{c.woodhall}</div>}
      <div><b>Get in touch</b>{c.phone}<br/>{c.email}</div>
    </div>
  </footer>;
}
