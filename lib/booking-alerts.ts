import {getSetting,readSiteContent,type NewBookingRequest} from './db';
import {sendEmail,esc,type EmailResult} from './email';
import {siteUrl} from './seo';

export const ALERT_EMAIL_KEY='booking_alert_email';

// Where alerts go: the address Emma set in the portal, else her public email.
export async function alertAddress():Promise<string|null>{
  const set=(await getSetting(ALERT_EMAIL_KEY))?.trim();
  if(set)return set;
  const c=await readSiteContent();
  return c.email?.trim()||null;
}

function portalLink(){
  const base=siteUrl();
  return base?new URL('/portal',base).toString():'/portal';
}

// Email Emma about a new request. Reply-to is the customer, when they gave an
// email, so she can answer them straight from her inbox.
export async function notifyNewBooking(r:NewBookingRequest):Promise<EmailResult>{
  const to=await alertAddress();
  if(!to)return {ok:false,reason:'not-configured',detail:'No alert address'};
  const rows:[string,string|null][]=[
    ['Treatment',r.treatment],['Where',r.location],['When suits',r.preferences],
    ['Phone',r.phone],['Email',r.email],['Notes',r.notes],
  ];
  const present=rows.filter(([,v])=>v&&v.trim()) as [string,string][];
  const text=[
    `New booking request from ${r.name}`,
    '',
    ...present.map(([k,v])=>`${k}: ${v}`),
    '',
    'Nothing is booked until you confirm it. Check Fresha, then reply to the customer.',
    `Open your portal: ${portalLink()}`,
  ].join('\n');
  const html=`<div style="font-family:Arial,sans-serif;font-size:15px;color:#173235;max-width:560px">
  <p style="font-size:18px;margin:0 0 14px"><b>New booking request from ${esc(r.name)}</b></p>
  <table style="border-collapse:collapse;width:100%">${present.map(([k,v])=>
    `<tr><td style="padding:6px 12px 6px 0;color:#5d6d69;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${
      k==='Phone'?`<a href="tel:${esc(v.replace(/\s/g,''))}" style="color:#00544d">${esc(v)}</a>`:
      k==='Email'?`<a href="mailto:${esc(v)}" style="color:#00544d">${esc(v)}</a>`:
      esc(v).replace(/\n/g,'<br>')}</td></tr>`).join('')}</table>
  <p style="margin:18px 0 6px;color:#5d6d69">Nothing is booked until you confirm it. Check Fresha, then reply to the customer.</p>
  <p style="margin:0"><a href="${esc(portalLink())}" style="color:#00544d;font-weight:bold">Open your portal</a></p>
</div>`;
  return sendEmail({to,subject:`New booking request: ${r.treatment} — ${r.name}`,text,html,replyTo:r.email});
}

export async function sendTestAlert(to:string):Promise<EmailResult>{
  const text=`This is a test from your website.\n\nWhen a customer sends a booking request, the details will arrive at this address.\n\nOpen your portal: ${portalLink()}`;
  const html=`<div style="font-family:Arial,sans-serif;font-size:15px;color:#173235"><p><b>This is a test from your website.</b></p><p>When a customer sends a booking request, the details will arrive at this address.</p><p><a href="${esc(portalLink())}" style="color:#00544d;font-weight:bold">Open your portal</a></p></div>`;
  return sendEmail({to,subject:'Test: booking alerts are working',text,html});
}
