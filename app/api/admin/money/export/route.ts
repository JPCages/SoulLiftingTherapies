import {isAdmin} from '@/lib/auth';
import {listMoneyEntries} from '@/lib/db';
import {toCsv} from '@/lib/csv';

// A spreadsheet of money in and out for the accountant (opens in Excel, Numbers,
// Google Sheets, and imports into most accounting software).
export async function GET(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  const u=new URL(request.url);
  const from=/^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('from')??'')?u.searchParams.get('from')!:new Date(Date.now()-365*864e5).toISOString().slice(0,10);
  const to=/^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('to')??'')?u.searchParams.get('to')!:'9999-12-31';
  const rows=(await listMoneyEntries(from)).filter(e=>e.occurred_on<=to).reverse();
  const csv=toCsv([['Date','In or out','Category','Description','Amount (£)','Source'],...rows.map(e=>[e.occurred_on,e.kind==='in'?'In':'Out',e.category,e.description,(e.kind==='in'?1:-1)*e.amount_pennies/100,e.source])]);
  return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="money-${from}-to-${to==='9999-12-31'?'today':to}.csv"`,'Cache-Control':'no-store'}});
}
