import type {Provider} from './types';
import {sumup} from './providers/sumup';
import {square} from './providers/square';
import {stripe} from './providers/stripe';
import {zettle} from './providers/zettle';
import {xero} from './providers/xero';
import {quickbooks} from './providers/quickbooks';
import {freeagent} from './providers/freeagent';
import {sage} from './providers/sage';

// Every system a business can connect. Add a provider: write one adapter, list it here.
export const PROVIDERS:Provider[]=[sumup,square,stripe,zettle,xero,quickbooks,freeagent,sage];
export const providerById=(id:string)=>PROVIDERS.find(p=>p.id===id)??null;
