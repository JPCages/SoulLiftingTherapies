// Simple in-process, per-key throttle shared by the booking form and the login routes.
// Not a substitute for a real rate limiter: counts live in memory, so they reset when the
// server restarts and are per instance. It is enough to stop one client hammering a route.

export type RateLimiter={
  /** True when `key` has already used up its allowance inside the window. */
  isLimited(key:string):boolean;
  /** Count one attempt against `key`. */
  record(key:string):void;
  /** Forget everything (used by tests). */
  reset():void;
};

export function createRateLimiter({limit,windowMs,maxKeys=5000}:{limit:number;windowMs:number;maxKeys?:number}):RateLimiter{
  const recent=new Map<string,number[]>();
  function live(key:string){
    const now=Date.now();
    const hits=(recent.get(key)??[]).filter(t=>now-t<windowMs);
    if(hits.length)recent.set(key,hits);else recent.delete(key);
    return hits;
  }
  return {
    isLimited(key){return live(key).length>=limit},
    record(key){
      const hits=live(key);
      hits.push(Date.now());
      recent.set(key,hits);
      if(recent.size>maxKeys)recent.clear();
    },
    reset(){recent.clear()},
  };
}

/** First hop of X-Forwarded-For (what Railway's proxy sets), or 'unknown'. */
export function clientIp(request:Request):string{
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
}

/** Login throttle: 5 attempts per IP per 15 minutes, shared by both login routes. */
export const loginLimiter=createRateLimiter({limit:5,windowMs:15*60*1000});
export const LOGIN_THROTTLED={error:'Too many sign-in attempts. Please wait 15 minutes and try again.'};
