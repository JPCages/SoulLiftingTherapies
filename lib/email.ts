// Outgoing email through Resend's REST API. No SDK: one fetch is all it needs.
// Nothing here may throw into the caller: an email that fails to send must
// never stop a customer's booking request from being saved.

export type EmailResult={ok:true;id:string}|{ok:false;reason:'not-configured'|'failed';detail?:string};

// Email is "on" only when both the key and a verified sender are set in Railway.
export function emailConfigured():boolean{
  return !!process.env.RESEND_API_KEY?.trim()&&!!process.env.EMAIL_FROM?.trim();
}

export async function sendEmail(m:{to:string;subject:string;text:string;html:string;replyTo?:string|null}):Promise<EmailResult>{
  if(!emailConfigured())return {ok:false,reason:'not-configured'};
  try{
    const r=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY!.trim()}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:process.env.EMAIL_FROM!.trim(),
        to:m.to,
        subject:m.subject,
        text:m.text,
        html:m.html,
        ...(m.replyTo?{reply_to:m.replyTo}:{}),
      }),
      signal:AbortSignal.timeout(8000),
    });
    const out=await r.json().catch(()=>({})) as {id?:string;message?:string;name?:string};
    if(!r.ok||!out.id)return {ok:false,reason:'failed',detail:out.message||out.name||`HTTP ${r.status}`};
    return {ok:true,id:out.id};
  }catch(e){
    return {ok:false,reason:'failed',detail:e instanceof Error?e.message:'Network error'};
  }
}

export const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
