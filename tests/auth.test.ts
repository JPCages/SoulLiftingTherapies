import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {ADMIN_TOKEN_MAX_AGE_MS,createAdminToken,getAuthSecret,signToken,verifyAdminToken,verifyToken} from '@/lib/auth';
import {CUSTOMER_TOKEN_MAX_AGE_MS,createCustomerToken,verifyCustomerToken} from '@/lib/customer-auth';

const env=process.env;
beforeEach(()=>{env.AUTH_SECRET='test-secret-for-unit-tests';env.ADMIN_EMAIL='admin@example.com';delete env.NEXT_PHASE});
afterEach(()=>{delete env.AUTH_SECRET;delete env.ADMIN_EMAIL;delete env.NEXT_PHASE});

describe('getAuthSecret',()=>{
  it('throws when AUTH_SECRET is missing',()=>{
    delete env.AUTH_SECRET;
    expect(()=>getAuthSecret()).toThrow('AUTH_SECRET is not set');
  });
  it('throws when AUTH_SECRET is empty',()=>{
    env.AUTH_SECRET='';
    expect(()=>getAuthSecret()).toThrow('AUTH_SECRET is not set');
  });
  it('returns the configured secret',()=>{
    expect(getAuthSecret()).toBe('test-secret-for-unit-tests');
  });
  it('tolerates a missing secret only during `next build`',()=>{
    delete env.AUTH_SECRET;
    env.NEXT_PHASE='phase-production-build';
    expect(()=>getAuthSecret()).not.toThrow();
  });
});

describe('admin token',()=>{
  it('round-trips a fresh token',()=>{
    expect(verifyAdminToken(createAdminToken('admin@example.com'))).toBe(true);
  });
  it('rejects a token older than 12 hours',()=>{
    const issuedAt=Date.now()-ADMIN_TOKEN_MAX_AGE_MS-1000;
    const stale=signToken('admin','admin@example.com',issuedAt);
    expect(verifyAdminToken(stale)).toBe(false);
    expect(verifyAdminToken(signToken('admin','admin@example.com',Date.now()-ADMIN_TOKEN_MAX_AGE_MS+60_000))).toBe(true);
  });
  it('rejects a tampered issuedAt, a bad signature and the legacy format',()=>{
    const issuedAt=Date.now(), token=signToken('admin','admin@example.com',issuedAt);
    const sig=token.slice(token.lastIndexOf('.')+1);
    expect(verifyAdminToken(token)).toBe(true);
    expect(verifyAdminToken(`admin@example.com.${issuedAt+5000}.${sig}`)).toBe(false);
    expect(verifyAdminToken(`admin@example.com.${issuedAt}.${'0'.repeat(64)}`)).toBe(false);
    expect(verifyAdminToken(`admin@example.com.${sig}`)).toBe(false);   // pre-issuedAt cookie
    expect(verifyAdminToken(undefined)).toBe(false);
  });
  it('rejects a valid token for a different email than ADMIN_EMAIL',()=>{
    expect(verifyAdminToken(createAdminToken('someone@example.com'))).toBe(false);
    env.ADMIN_EMAIL='';
    expect(verifyAdminToken(createAdminToken(''))).toBe(false);
  });
  it('does not accept an admin signature as a customer token or vice versa',()=>{
    expect(verifyToken('customer',signToken('admin','7'),CUSTOMER_TOKEN_MAX_AGE_MS)).toBeNull();
    expect(verifyToken('admin',signToken('customer','7'),ADMIN_TOKEN_MAX_AGE_MS)).toBeNull();
  });
});

describe('customer token',()=>{
  it('round-trips a fresh token',()=>{
    expect(verifyCustomerToken(createCustomerToken(42))).toBe(42);
  });
  it('rejects a token older than 30 days',()=>{
    const stale=signToken('customer','42',Date.now()-CUSTOMER_TOKEN_MAX_AGE_MS-1000);
    expect(verifyCustomerToken(stale)).toBeNull();
  });
  it('rejects a token signed with a different secret',()=>{
    const token=createCustomerToken(42);
    env.AUTH_SECRET='another-secret';
    expect(verifyCustomerToken(token)).toBeNull();
  });
});
