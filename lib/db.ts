import {Pool} from 'pg';
import {defaultSiteContent,type SiteContent} from './site-content';

const globalDb=globalThis as unknown as {soulPool?:Pool};
// Decide SSL from the connection string, not NODE_ENV: local, and Railway's
// internal (*.railway.internal) hosts, speak plain TCP; public managed hosts need SSL.
function sslFor(url:string):false|{rejectUnauthorized:boolean}{
  if(/[?&]sslmode=disable/.test(url))return false;
  if(/@(localhost|127\.0\.0\.1|\[::1\]|[^/]*\.railway\.internal)/.test(url))return false;
  return {rejectUnauthorized:false};
}
function pool(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');return globalDb.soulPool??=new Pool({connectionString:process.env.DATABASE_URL,ssl:sslFor(process.env.DATABASE_URL)})}
async function ready(){await pool().query('CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY, content JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')}
export async function readSiteContent():Promise<SiteContent>{if(!process.env.DATABASE_URL)return defaultSiteContent;await ready();const {rows}=await pool().query('SELECT content FROM site_content WHERE id=1');return rows[0]?.content??defaultSiteContent}
export async function writeSiteContent(content:SiteContent){await ready();await pool().query('INSERT INTO site_content(id,content,updated_at) VALUES(1,$1,NOW()) ON CONFLICT(id) DO UPDATE SET content=EXCLUDED.content,updated_at=NOW()',[JSON.stringify(content)])}

// --- Image store (kept out of the SiteContent JSON so public pages stay light) ---
async function imagesReady(){await pool().query('CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')}
export async function saveImage(id:string,mime:string,data:Buffer){await imagesReady();await pool().query('INSERT INTO images(id,mime,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET mime=EXCLUDED.mime,data=EXCLUDED.data',[id,mime,data])}
export async function readImage(id:string):Promise<{mime:string;data:Buffer}|null>{if(!process.env.DATABASE_URL)return null;await imagesReady();const {rows}=await pool().query('SELECT mime,data FROM images WHERE id=$1',[id]);return rows[0]?{mime:rows[0].mime,data:rows[0].data as Buffer}:null}
