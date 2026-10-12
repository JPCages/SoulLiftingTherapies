import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {POST as adminLogin} from '@/app/api/admin/login/route';
import {POST as unifiedLogin} from '@/app/api/auth/login/route';
import {loginLimiter} from '@/lib/rate-limit';

const env=process.env;
beforeEach(()=>{
  loginLimiter.reset();
  env.AUTH_SECRET='test-secret-for-unit-tests';
  env.ADMIN_EMAIL='admin@example.com';
  env.ADMIN_PASSWORD='correct horse battery staple';
  delete env.DATABASE_URL;
});
afterEach(()=>{loginLimiter.reset();delete env.AUTH_SECRET;delete env.ADMIN_EMAIL;delete env.ADMIN_PASSWORD});

function post(body:unknown,ip:string){
  return new Request('http://localhost/api/login',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':ip},body:JSON.stringify(body)});
}
const wrong={email:'admin@example.com',password:'nope'};
const right={email:'admin@example.com',password:'correct horse battery staple'};

for(const [name,handler] of [['/api/admin/login',adminLogin],['/api/auth/login',unifiedLogin]] as const){
  describe(name,()=>{
    it('returns 429 on the 6th attempt from one IP within 15 minutes',async()=>{
      for(let i=0;i<5;i++)expect((await handler(post(wrong,'203.0.113.9'))).status).toBe(401);
      const sixth=await handler(post(wrong,'203.0.113.9'));
      expect(sixth.status).toBe(429);
      // Even the correct password is refused once throttled.
      expect((await handler(post(right,'203.0.113.9'))).status).toBe(429);
    });
    it('throttles per IP, so another IP is unaffected',async()=>{
      for(let i=0;i<6;i++)await handler(post(wrong,'203.0.113.9'));
      expect((await handler(post(right,'198.51.100.4'))).status).toBe(200);
    });
    it('rejects a password that differs in length and one that differs in content',async()=>{
      expect((await handler(post({email:'admin@example.com',password:'correct horse battery stapl'},'203.0.113.1'))).status).toBe(401);
      expect((await handler(post({email:'admin@example.com',password:'correct horse battery stapl3'},'203.0.113.1'))).status).toBe(401);
    });
    it('signs in with the right credentials and sets an admin cookie',async()=>{
      const res=await handler(post(right,'203.0.113.2'));
      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toMatch(/^soul_admin=admin%40example\.com\.\d+\.[0-9a-f]{64};/);
    });
  });
}
