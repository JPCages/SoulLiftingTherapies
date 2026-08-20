import {Pool} from 'pg';
import {defaultSiteContent,type SiteContent} from './site-content';

const globalDb=globalThis as unknown as {soulPool?:Pool};
function pool(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');return globalDb.soulPool??=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined})}
async function ready(){await pool().query('CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY, content JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')}
export async function readSiteContent():Promise<SiteContent>{if(!process.env.DATABASE_URL)return defaultSiteContent;await ready();const {rows}=await pool().query('SELECT content FROM site_content WHERE id=1');return rows[0]?.content??defaultSiteContent}
export async function writeSiteContent(content:SiteContent){await ready();await pool().query('INSERT INTO site_content(id,content,updated_at) VALUES(1,$1,NOW()) ON CONFLICT(id) DO UPDATE SET content=EXCLUDED.content,updated_at=NOW()',[JSON.stringify(content)])}
