"use client";
import { FormEvent, useEffect, useState } from "react";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content";
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';
import PageHero from '../page-hero';
import { safePayLink } from "@/lib/vouchers";

// Quick picks save typing on a phone; whatever is ticked is folded into one
// preferences line alongside anything the customer writes themselves.
const WINDOWS = ["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Saturdays"];

export default function Book() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [picked, setPicked] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/content').then(r => r.ok ? r.json() : null).then(x => x && setContent(x)).catch(() => {}); }, []);
  // Signed-in customers get their name and email filled in, and a feeling picked
  // on their account page arrives as a note for Emma. All still editable.
  const [prefill, setPrefill] = useState<{ name: string; email: string; notes: string; treatment: string } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const feeling = q.get('feeling')?.slice(0, 60) ?? '';
    const treatment = q.get('treatment')?.slice(0, 120) ?? '';
    const notes = feeling ? `Feeling: ${feeling.toLowerCase()}.` : '';
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
      .then(m => setPrefill({ name: m?.role === 'customer' ? m.name ?? '' : '', email: m?.role === 'customer' ? m.email ?? '' : '', notes, treatment }))
      .catch(() => setPrefill({ name: '', email: '', notes, treatment }));
  }, []);

  const copy = { ...defaultSiteContent, ...content };
  // "Book this treatment" on the treatments page arrives as ?treatment=Name.
  const optionFor = (name: string) => { for (const c of copy.categories) for (const s of c.services) if (s.name === name) return `${s.name} (${s.price}, ${s.duration})`; return ''; };
  const chosen = prefill?.treatment ? optionFor(prefill.treatment) : '';
  // Instant booking: a link to the booking system the salon already uses.
  const instant = copy.bookingMode !== 'request' ? safePayLink(copy.bookingLink) : null;
  const instantOnly = instant && copy.bookingMode === 'instant';
  const toggle = (w: string) => setPicked(p => p.includes(w) ? p.filter(x => x !== w) : [...p, w]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const data = new FormData(e.currentTarget);
    const typed = String(data.get('preferences') ?? '').trim();
    const preferences = [picked.join(', '), typed].filter(Boolean).join(' — ');
    const r = await fetch('/api/bookings', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'), phone: data.get('phone'), email: data.get('email'),
        treatment: data.get('treatment'), location: data.get('location'),
        preferences, notes: data.get('notes'), website: data.get('website'),
        shortNotice: data.get('shortNotice') === 'on',
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (r.ok) { setSent(true); return; }
    setError(out.error || 'Something went wrong. Please call Emma instead.'); setBusy(false);
  }

  if (sent) return <><SiteHeader content={copy}/><main className="booking-page success site-lux">
    <p className="eyebrow">{copy.bookingRequestEyebrow}</p>
    <h1>{copy.bookingRequestSuccessHeading}</h1>
    <p>{copy.bookingRequestSuccessBody}</p>
    <p className="booking-contact">Need it sooner? Call or text Emma on <a href={`tel:${copy.phone.replace(/\s/g, '')}`}>{copy.phone}</a>.</p>
    <a className="primary" href="/services">Back to treatments</a>
  </main><SiteFooter content={copy}/></>;

  return <><SiteHeader content={copy} overlay/><main className="booking-page site-lux">
    <PageHero image={copy.bookingHeroImage} label={copy.bookingRequestEyebrow} title={copy.bookingRequestHeading??''} intro={copy.bookingRequestIntro} alt={`${copy.businessName} treatment room`}/>
    {instant && <section className={instantOnly ? 'instant-book solo' : 'instant-book'}>
      <h2>{instantOnly ? 'Choose your time online' : 'Know what you want?'}</h2>
      <p>{instantOnly ? 'See the free times and book straight away.' : 'See the free times and book straight away, or send Emma a request below and she will find a time for you.'}</p>
      <a className="primary" href={instant} target="_blank" rel="noopener">{copy.bookingLinkLabel || 'Book online now'}</a>
      {instantOnly && <p className="booking-contact">Prefer to talk? Call or text <a href={`tel:${copy.phone.replace(/\s/g, '')}`}>{copy.phone}</a>.</p>}
    </section>}
    {!instantOnly && <form className="booking" onSubmit={submit} key={prefill ? 'ready:' + chosen : 'loading'}>
      <fieldset>
        <legend>1. Which treatment?</legend>
        <label className="sr-only" htmlFor="treatment">Treatment</label>
        <select id="treatment" name="treatment" required defaultValue={chosen}>
          <option value="">Choose a treatment</option>
          {copy.categories.filter(c => c.services.length).map(c =>
            <optgroup key={c.name} label={c.name}>
              {c.services.map(s => <option key={s.name} value={`${s.name} (${s.price}, ${s.duration})`}>{s.name} — {s.price} · {s.duration}</option>)}
            </optgroup>)}
        </select>
      </fieldset>

      <fieldset>
        <legend>2. Where would you like to be seen?</legend>
        <label className="sr-only" htmlFor="location">Location</label>
        <select id="location" name="location" required defaultValue="Either">
          <option value="Horncastle">Horncastle — {copy.horncastle}</option>
          <option value="Woodhall Spa">Woodhall Spa — {copy.woodhall}</option>
          <option value="Either">Either, whichever Emma has free</option>
        </select>
      </fieldset>

      <fieldset>
        <legend>3. When suits you?</legend>
        <div className="time-picks">
          {WINDOWS.map(w => <button type="button" key={w} className={picked.includes(w) ? 'pick selected' : 'pick'} aria-pressed={picked.includes(w)} onClick={() => toggle(w)}>{w}</button>)}
        </div>
        <label htmlFor="preferences">Anything more specific? Dates you cannot do?
          <textarea id="preferences" name="preferences" rows={3} placeholder="e.g. any Tuesday after 2pm, or the week of the 21st — not Fridays" />
        </label>
        <label className="check-line"><input type="checkbox" name="shortNotice" /> I can come at short notice if a space opens up</label>
        <p className="note">{copy.bookingRequestNote}</p>
      </fieldset>

      <fieldset>
        <legend>4. Your details</legend>
        <div className="grid">
          <label htmlFor="name">Your name<input id="name" name="name" required autoComplete="name" defaultValue={prefill?.name} /></label>
          <label htmlFor="phone">Mobile number<input id="phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" /></label>
          <label className="wide" htmlFor="email">Email <span className="optional">(optional)</span><input id="email" name="email" type="email" autoComplete="email" defaultValue={prefill?.email} /></label>
        </div>
        <label htmlFor="notes">Anything Emma should know? <span className="optional">(optional)</span>
          <textarea id="notes" name="notes" rows={2} defaultValue={prefill?.notes} placeholder="First visit, a treatment you have had before, anything she should be aware of" />
        </label>
        <label className="hp" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </fieldset>

      {error && <p className="login-error">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send request to Emma'}</button>
      <p className="booking-contact">Prefer to talk? Call or text <a href={`tel:${copy.phone.replace(/\s/g, '')}`}>{copy.phone}</a>.</p>
    </form>}
  </main><SiteFooter content={copy}/></>;
}
