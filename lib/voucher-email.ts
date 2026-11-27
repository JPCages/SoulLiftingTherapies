import {readSiteContent,type Voucher} from './db';
import {sendEmail,esc,type EmailResult} from './email';
import {alertAddress} from './booking-alerts';
import {formatPounds} from './vouchers';

const ukDate=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'});

// Tell the salon someone has started buying a voucher, so she can look for the payment.
export async function notifyVoucherOrder(v:Voucher):Promise<EmailResult>{
  const to=await alertAddress();
  if(!to)return {ok:false,reason:'not-configured'};
  const lines=[`${v.buyer_name} is buying a ${formatPounds(v.amount_pennies)} gift voucher.`,
    v.recipient_name?`For: ${v.recipient_name}`:'',v.buyer_email?`Email: ${v.buyer_email}`:'',
    '','When the payment shows in your account, open Vouchers in your desk and press Paid - send voucher.'].filter(l=>l!==null);
  return sendEmail({to,subject:`Gift voucher order: ${formatPounds(v.amount_pennies)} from ${v.buyer_name}`,
    text:lines.join('\n'),html:`<div style="font-family:Arial,sans-serif;font-size:15px;color:#173235">${lines.map(l=>l?`<p style="margin:0 0 8px">${esc(l)}</p>`:'').join('')}</div>`,replyTo:v.buyer_email});
}

// The voucher itself, emailed to the buyer once paid.
export async function sendVoucherToBuyer(v:Voucher):Promise<EmailResult|null>{
  if(!v.buyer_email||!v.code)return null;
  const c=await readSiteContent();
  const amount=formatPounds(v.amount_pennies);
  const expiry=v.expires_on?`Valid until ${ukDate(v.expires_on)}.`:'';
  const terms=(c.voucherTerms||'').trim();
  const book=c.phone?.trim()?`To book, call or text ${c.phone.trim()} and quote the code.`:'To book, get in touch and quote the code.';
  const text=[`Hi ${v.buyer_name},`,'',`Thank you. Here is your ${amount} gift voucher for ${c.businessName}.`,'',
    v.recipient_name?`For: ${v.recipient_name}`:'',`Code: ${v.code}`,expiry,v.message?`Message: ${v.message}`:'','',book,terms,'',c.businessName].filter(Boolean).join('\n');
  const html=`<div style="font-family:Arial,sans-serif;font-size:15px;color:#173235;max-width:560px">
  <p>Hi ${esc(v.buyer_name)},</p><p>Thank you. Here is your gift voucher.</p>
  <div style="border:1px solid #d8cdb8;border-radius:12px;padding:22px;text-align:center;background:#faf6ef;margin:16px 0">
    <p style="margin:0;color:#5d6d69;letter-spacing:.12em;font-size:12px;text-transform:uppercase">${esc(c.businessName)} gift voucher</p>
    <p style="font-size:34px;margin:10px 0;font-family:Georgia,serif">${esc(amount)}</p>
    ${v.recipient_name?`<p style="margin:0 0 8px">For ${esc(v.recipient_name)}</p>`:''}
    ${v.message?`<p style="margin:0 0 10px;font-style:italic">${esc(v.message)}</p>`:''}
    <p style="margin:12px 0 0;font-size:20px;letter-spacing:.08em"><b>${esc(v.code)}</b></p>
    ${expiry?`<p style="margin:6px 0 0;color:#5d6d69;font-size:13px">${esc(expiry)}</p>`:''}
  </div>
  <p>${esc(book)}</p>${terms?`<p style="color:#5d6d69;font-size:13px">${esc(terms)}</p>`:''}<p>${esc(c.businessName)}</p></div>`;
  return sendEmail({to:v.buyer_email,subject:`Your ${amount} gift voucher from ${c.businessName}`,text,html,replyTo:c.email?.trim()||null});
}
