import nodemailer,{type Transporter} from 'nodemailer';

// Outgoing email over SMTP, through a mailbox the business already owns
// (Emma's Gmail, or any other provider). Railway allows outbound SMTP on the
// Pro plan only; on lower plans every send fails and is reported as such.
// Nothing here may throw into the caller: an email that fails to send must
// never stop a customer's booking request from being saved.

export type EmailResult={ok:true;id:string}|{ok:false;reason:'not-configured'|'failed';detail?:string};

type SmtpConfig={host:string;port:number;user:string;pass:string;from:string};

// Read the mailbox settings from Railway variables. Null until host, user and
// password are all present. SMTP_PORT defaults to 587 (STARTTLS); 465 uses SSL.
export function smtpConfig(env:Record<string,string|undefined>=process.env):SmtpConfig|null{
  const host=env.SMTP_HOST?.trim(), user=env.SMTP_USER?.trim(), pass=env.SMTP_PASS?.trim();
  if(!host||!user||!pass)return null;
  const port=Number(env.SMTP_PORT?.trim()||587);
  if(!Number.isInteger(port)||port<=0)return null;
  return {host,port,user,pass,from:env.EMAIL_FROM?.trim()||user};
}

export function emailConfigured():boolean{return smtpConfig()!==null}

let cached:{key:string;transport:Transporter}|null=null;
function transportFor(c:SmtpConfig):Transporter{
  const key=`${c.host}|${c.port}|${c.user}|${c.pass}`;
  if(cached?.key===key)return cached.transport;
  const transport=nodemailer.createTransport({
    host:c.host,port:c.port,secure:c.port===465,requireTLS:c.port!==465,
    auth:{user:c.user,pass:c.pass},
    connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:15_000,
  });
  cached={key,transport};
  return transport;
}

// Turn a mail-server error into a sentence Emma or JP can act on. The raw
// detail can include the server's reply, never the password.
export function explainFailure(e:unknown):string{
  const err=e as {code?:string;responseCode?:number;message?:string};
  if(err?.code==='EAUTH'||err?.responseCode===535)return 'The mailbox refused the password. If it is a Gmail app password, it is revoked whenever the Google password changes — create a new one.';
  if(err?.code==='ETIMEDOUT'||err?.code==='ECONNECTION'||err?.code==='ESOCKET')return 'Could not reach the mail server. Check SMTP_HOST and SMTP_PORT, and that the Railway plan allows SMTP.';
  return err?.message?.slice(0,200)||'Unknown mail error';
}

export async function sendEmail(m:{to:string;subject:string;text:string;html:string;replyTo?:string|null}):Promise<EmailResult>{
  const c=smtpConfig();
  if(!c)return {ok:false,reason:'not-configured'};
  try{
    const info=await transportFor(c).sendMail({
      from:c.from,to:m.to,subject:m.subject,text:m.text,html:m.html,
      ...(m.replyTo?{replyTo:m.replyTo}:{}),
    });
    return {ok:true,id:String(info.messageId||'sent')};
  }catch(e){
    return {ok:false,reason:'failed',detail:explainFailure(e)};
  }
}

export const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
