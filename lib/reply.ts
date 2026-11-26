// Ready-written replies to a booking request, and the links that open them in
// WhatsApp, Messages or email on Emma's phone or computer.

export type ReplyKind='offer'|'decline';
type Req={name:string;treatment:string;location:string;phone:string;email:string|null};

// "Facial (£45, 45 minutes)" reads better in a message as "Facial".
export const shortTreatment=(t:string)=>t.replace(/\s*\([^)]*\)\s*$/,'').trim()||t;
const firstName=(n:string)=>n.trim().split(/\s+/)[0]||n.trim();

export function fillReply(template:string,r:Req,business:string):string{
  const where=/^either/i.test(r.location)?'[Horncastle or Woodhall Spa]':r.location;
  return template
    .replace(/\{name\}/g,firstName(r.name))
    .replace(/\{treatment\}/g,shortTreatment(r.treatment))
    .replace(/\{location\}/g,where)
    .replace(/\{business\}/g,business);
}

// UK mobile numbers as WhatsApp wants them: digits only, 44 instead of the leading 0.
export function waNumber(phone:string):string|null{
  let d=phone.replace(/\D/g,'');
  if(d.startsWith('00'))d=d.slice(2);
  if(d.startsWith('0'))d='44'+d.slice(1);
  return d.length>=10?d:null;
}

export function replyLinks(r:Req,message:string,subject:string){
  const wa=waNumber(r.phone);
  const body=encodeURIComponent(message);
  return {
    whatsapp:wa?`https://wa.me/${wa}?text=${body}`:null,
    // "?&body=" is read by both iPhone and Android messaging apps.
    sms:`sms:${r.phone.replace(/[^\d+]/g,'')}?&body=${body}`,
    email:r.email?`mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${body}`:null,
  };
}
