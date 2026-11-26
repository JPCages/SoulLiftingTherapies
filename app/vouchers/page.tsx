"use client";
import { FormEvent, useEffect, useState } from "react";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content";
import { formatPounds, safePayLink } from "@/lib/vouchers";
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';
import PageHero from '../page-hero';

// Gift vouchers, sold with the salon's own payment links. The order is saved and
// the salon told; the buyer pays on the payment page; the salon presses "Paid"
// and the voucher with its code is emailed to the buyer.
export default function Vouchers() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [option, setOption] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/content').then(r => r.ok ? r.json() : null).then(x => setContent(x ?? defaultSiteContent)).catch(() => setContent(defaultSiteContent)); }, []);
  const copy = { ...defaultSiteContent, ...(content ?? {}) };
  // Keep each option's position in the saved list, which is what the server checks against.
  const options = (copy.voucherOptions ?? []).map((o, at) => ({ ...o, at })).filter(o => o.amount > 0 && safePayLink(o.link));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const d = new FormData(e.currentTarget);
    const r = await fetch('/api/vouchers', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ option: options[option]?.at, name: d.get('name'), email: d.get('email'), recipient: d.get('recipient'), message: d.get('message'), website: d.get('website') }) });
    const out = await r.json().catch(() => ({}));
    if (r.ok && out.payUrl) { window.location.assign(out.payUrl); return; }
    setError(out.error || 'Something went wrong. Please get in touch instead.'); setBusy(false);
  }

  const off = content && (!copy.vouchersEnabled || options.length === 0);
  return <><SiteHeader content={copy} overlay/><main className="booking-page site-lux">
    <PageHero image={copy.servicesHeroImage} label="Gift vouchers" title="Give the gift of time" intro={copy.voucherIntro} alt={`${copy.businessName} treatment room`}/>
    {!content ? null : off ? <section className="instant-book solo"><h2>Vouchers are coming soon</h2><p>In the meantime, call or text <a href={`tel:${copy.phone.replace(/\s/g, '')}`}>{copy.phone}</a> and we can sort one out for you.</p></section> :
    <form className="booking" onSubmit={submit}>
      <fieldset>
        <legend>1. Choose a voucher</legend>
        <div className="voucher-picks" role="radiogroup" aria-label="Voucher">
          {options.map((o, i) => <button type="button" role="radio" aria-checked={option === i} key={i} className={option === i ? 'voucher-pick selected' : 'voucher-pick'} onClick={() => setOption(i)}>
            <strong>{formatPounds(Math.round(o.amount * 100))}</strong>{o.label && <span>{o.label}</span>}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>2. Who is it for?</legend>
        <label htmlFor="recipient">Their name <span className="optional">(optional)</span><input id="recipient" name="recipient" maxLength={80} /></label>
        <label htmlFor="message">A message for the voucher <span className="optional">(optional)</span><textarea id="message" name="message" rows={2} maxLength={240} placeholder="Happy birthday, love from..." /></label>
      </fieldset>
      <fieldset>
        <legend>3. Your details</legend>
        <div className="grid">
          <label htmlFor="name">Your name<input id="name" name="name" required autoComplete="name" /></label>
          <label htmlFor="email">Your email<input id="email" name="email" type="email" required autoComplete="email" /></label>
        </div>
        <p className="note">Next you pay securely on our payment page. As soon as we see your payment, we email you the voucher with its code.</p>
        {copy.voucherTerms && <p className="note">{copy.voucherTerms}</p>}
        <label className="hp" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </fieldset>
      {error && <p className="login-error">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'One moment…' : 'Continue to payment'}</button>
    </form>}
  </main><SiteFooter content={copy}/></>;
}
