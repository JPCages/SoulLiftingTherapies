import {claimDueReminders,releaseReminder,readSiteContent} from './db';
import {sendAppointmentReminder} from './booking-alerts';
import {emailConfigured} from './email';

// Reminder emails for confirmed appointments in the next 24 hours. Each row is
// claimed before sending, so two runs (or two servers) never send twice.
export async function runReminders(now=new Date()):Promise<{sent:number;failed:number}>{
  if(!process.env.DATABASE_URL||!emailConfigured())return {sent:0,failed:0};
  const c=await readSiteContent();
  if(c.remindersEnabled===false)return {sent:0,failed:0};
  const due=await claimDueReminders(now);
  let sent=0,failed=0;
  for(const r of due){
    const res=await sendAppointmentReminder(r).catch(e=>({ok:false as const,reason:'failed' as const,detail:String(e)}));
    if(res?.ok)sent++;else{failed++;await releaseReminder(r.id).catch(()=>{});console.error('Reminder email failed for request',r.id,res&&!res.ok?res.detail:'')}
  }
  return {sent,failed};
}

let started=false;
// Called once at server start (instrumentation.ts). Checks every 30 minutes.
export function startReminderLoop(){
  if(started||!process.env.DATABASE_URL)return;
  started=true;
  const tick=()=>runReminders().catch(e=>console.error('Reminder run failed:',e));
  setTimeout(tick,60_000);
  setInterval(tick,30*60_000).unref?.();
}
