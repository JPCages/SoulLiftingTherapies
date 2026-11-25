import {beforeEach,describe,expect,it,vi} from 'vitest';

// The customer's copy of their booking request: who it goes to, what it says.
const sent:Record<string,unknown>[]=[];
vi.mock('@/lib/email',()=>({
  esc:(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)),
  sendEmail:async(m:Record<string,unknown>)=>{sent.push(m);return {ok:true,id:'x'}},
}));
vi.mock('@/lib/db',async()=>{
  const {withDefaults}=await import('@/lib/site-content');
  return {readSiteContent:async()=>withDefaults({businessName:'Soul Lifting Therapies',email:'emma@example.com',phone:'07000 000000',bookingRequestSuccessHeading:'Request sent.',bookingRequestSuccessBody:'Emma will come back to you.'}),getSetting:async()=>null,setSetting:async()=>{}};
});
const {confirmToCustomer}=await import('@/lib/booking-alerts');

const req={name:'Sam <b>',email:'sam@example.com',phone:'07111 111111',treatment:'Facial',location:'Horncastle',preferences:'Tuesday mornings',notes:'private note',customerId:null};

beforeEach(()=>{sent.length=0});

describe('customer copy of a booking request',()=>{
  it('is sent to the customer, with replies going to Emma',async()=>{
    await confirmToCustomer(req);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({to:'sam@example.com',replyTo:'emma@example.com'});
    expect(String(sent[0].text)).toContain('Emma will come back to you.');
    expect(String(sent[0].text)).toContain('Tuesday mornings');
  });
  it('leaves out the notes and escapes the name',async()=>{
    await confirmToCustomer(req);
    expect(String(sent[0].text)).not.toContain('private note');
    expect(String(sent[0].html)).toContain('Sam &lt;b&gt;');
  });
  it('sends nothing when the customer gave no email',async()=>{
    expect(await confirmToCustomer({...req,email:null})).toBeNull();
    expect(sent).toHaveLength(0);
  });
});
