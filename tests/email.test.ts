import {beforeEach,describe,expect,it,vi} from 'vitest';

// Capture what the code asks nodemailer for, and control what sending does.
const sent:Record<string,unknown>[]=[];
const created:Record<string,unknown>[]=[];
let failWith:unknown=null;
vi.mock('nodemailer',()=>({default:{createTransport:(opts:Record<string,unknown>)=>{
  created.push(opts);
  return {sendMail:async(m:Record<string,unknown>)=>{if(failWith)throw failWith;sent.push(m);return {messageId:'<test@local>'}}};
}}}));

const {smtpConfig,sendEmail,explainFailure,emailConfigured}=await import('@/lib/email');

const base={SMTP_HOST:'smtp.gmail.com',SMTP_USER:'owner@gmail.com',SMTP_PASS:'app-password'};
const msg={to:'emma@example.com',subject:'Hi',text:'t',html:'<p>t</p>'};

beforeEach(()=>{
  sent.length=0;created.length=0;failWith=null;
  for(const k of ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','EMAIL_FROM'])delete process.env[k];
});

describe('smtpConfig',()=>{
  it('is off until host, user and password are all set',()=>{
    expect(smtpConfig({})).toBeNull();
    expect(smtpConfig({SMTP_HOST:'h',SMTP_USER:'u'})).toBeNull();
    expect(smtpConfig({SMTP_USER:'u',SMTP_PASS:'p'})).toBeNull();
    expect(smtpConfig(base)).not.toBeNull();
  });
  it('defaults to port 587 and sends from the mailbox itself',()=>{
    expect(smtpConfig(base)).toMatchObject({port:587,from:'owner@gmail.com'});
  });
  it('uses EMAIL_FROM when given',()=>{
    expect(smtpConfig({...base,EMAIL_FROM:'Soul Lifting <owner@gmail.com>'})?.from).toBe('Soul Lifting <owner@gmail.com>');
  });
  it('rejects a nonsense port rather than guessing',()=>{
    expect(smtpConfig({...base,SMTP_PORT:'abc'})).toBeNull();
  });
});

describe('sendEmail',()=>{
  it('does nothing and says so when email is not set up',async()=>{
    expect(emailConfigured()).toBe(false);
    expect(await sendEmail(msg)).toEqual({ok:false,reason:'not-configured'});
    expect(created).toHaveLength(0);
  });
  it('uses STARTTLS on 587, with TLS required, and passes reply-to through',async()=>{
    Object.assign(process.env,base);
    const r=await sendEmail({...msg,replyTo:'customer@example.com'});
    expect(r.ok).toBe(true);
    expect(created[0]).toMatchObject({host:'smtp.gmail.com',port:587,secure:false,requireTLS:true,auth:{user:'owner@gmail.com',pass:'app-password'}});
    expect(sent[0]).toMatchObject({from:'owner@gmail.com',to:'emma@example.com',replyTo:'customer@example.com'});
  });
  it('uses SSL on 465',async()=>{
    Object.assign(process.env,{...base,SMTP_PORT:'465',SMTP_PASS:'other'});
    await sendEmail(msg);
    expect(created.at(-1)).toMatchObject({port:465,secure:true});
  });
  it('omits reply-to when the customer gave no email',async()=>{
    Object.assign(process.env,base);
    await sendEmail({...msg,replyTo:null});
    expect(sent[0]).not.toHaveProperty('replyTo');
  });
  it('never throws: a refused password comes back as a readable failure',async()=>{
    Object.assign(process.env,base);
    failWith=Object.assign(new Error('Invalid login: 535-5.7.8 Username and Password not accepted'),{code:'EAUTH',responseCode:535});
    const r=await sendEmail(msg);
    expect(r).toMatchObject({ok:false,reason:'failed'});
    expect(r.ok?'':r.detail).toMatch(/app password/);
  });
});

describe('explainFailure',()=>{
  it('names the network problem, including the Railway plan',()=>{
    expect(explainFailure({code:'ETIMEDOUT'})).toMatch(/Railway plan/);
  });
  it('falls back to the server message',()=>{
    expect(explainFailure(new Error('Mailbox full'))).toBe('Mailbox full');
  });
});
