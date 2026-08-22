"use client";
import { useEffect, useState } from "react";
import { slots } from "../../lib/sandbox-data";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content";

export default function Book() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [slot, setSlot] = useState("one");
  const [sent, setSent] = useState(false);
  useEffect(() => { fetch('/api/content').then(r => r.ok ? r.json() : null).then(x => x && setContent(x)).catch(() => {}); }, []);
  const services = content.categories.flatMap(c => c.services);
  if (sent) return <main className="booking-page success"><p className="eyebrow">Sandbox confirmation</p><h1>{content.bookingSuccessHeading}</h1><p>{content.bookingSuccessBody}</p><button className="primary" onClick={() => setSent(false)}>Try again</button></main>;
  return <main className="booking-page"><header className="nav"><a className="wordmark" href="/">{content.businessName.split(' ').slice(0,-1).join(' ')} <i>{content.businessName.split(' ').at(-1)}</i></a><a className="nav-button" href="/portal">Emma&apos;s portal</a></header><section className="page-hero"><p className="eyebrow">{content.bookingEyebrow}</p><h1>{content.bookingHeading}</h1><p>{content.bookingIntro}</p></section><form className="booking" onSubmit={(e) => { e.preventDefault(); setSent(true); }}><fieldset><legend>1. Choose an example slot</legend>{slots.map((item) => <label className={slot === item.id ? "slot selected" : "slot"} key={item.id}><input type="radio" checked={slot === item.id} onChange={() => setSlot(item.id)} /><span><b>{item.location}</b>{item.time}<small>{item.length} available</small></span></label>)}</fieldset><fieldset><legend>2. Choose a treatment</legend><select required><option value="">Choose a treatment</option>{services.map((item) => <option key={item.name}>{item.name} - {item.price} · {item.duration}</option>)}</select><p className="note">{content.bookingNote}</p></fieldset><fieldset><legend>3. Your details</legend><div className="grid"><label>First name<input required /></label><label>Surname<input required /></label><label>Email<input type="email" required /></label><label>Mobile number<input required /></label></div></fieldset><button className="primary">Send test booking request</button></form></main>;
}
