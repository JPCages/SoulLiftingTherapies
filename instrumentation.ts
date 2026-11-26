// Runs once when the server starts. Only the Node.js server runs the reminder loop.
export async function register(){
  if(process.env.NEXT_RUNTIME!=='nodejs')return;
  const {startReminderLoop}=await import('./lib/reminders');
  startReminderLoop();
}
