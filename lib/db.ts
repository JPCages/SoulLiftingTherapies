import {Pool} from 'pg';
import {withDefaults,type SiteContent} from './site-content';

const globalDb=globalThis as unknown as {soulPool?:Pool};
// Decide SSL from the connection string, not NODE_ENV: local, and Railway's
// internal (*.railway.internal) hosts, speak plain TCP; public managed hosts need SSL.
function sslFor(url:string):false|{rejectUnauthorized:boolean}{
  if(/[?&]sslmode=disable/.test(url))return false;
  if(/@(localhost|127\.0\.0\.1|\[::1\]|[^/]*\.railway\.internal)/.test(url))return false;
  return {rejectUnauthorized:false};
}
function pool(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');return globalDb.soulPool??=new Pool({connectionString:process.env.DATABASE_URL,ssl:sslFor(process.env.DATABASE_URL)})}

// Schema setup runs once per process. Without this, two concurrent requests against a
// cold database race on CREATE TABLE IF NOT EXISTS and Postgres raises a duplicate-key
// error on pg_type. A failed attempt is forgotten so the next request can retry.
const schemaReady=new Map<string,Promise<void>>();
function once(key:string,fn:()=>Promise<void>):Promise<void>{
  let p=schemaReady.get(key);
  if(!p){ p=fn().catch(e=>{schemaReady.delete(key);throw e}); schemaReady.set(key,p) }
  return p;
}

function ready(){return once('site_content',async()=>{await pool().query('CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY, content JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')})}
export async function readSiteContent():Promise<SiteContent>{if(!process.env.DATABASE_URL)return withDefaults();await ready();const {rows}=await pool().query('SELECT content FROM site_content WHERE id=1');return withDefaults(rows[0]?.content)}
export async function writeSiteContent(content:SiteContent){await ready();await pool().query('INSERT INTO site_content(id,content,updated_at) VALUES(1,$1,NOW()) ON CONFLICT(id) DO UPDATE SET content=EXCLUDED.content,updated_at=NOW()',[JSON.stringify(content)])}

// --- Image store (kept out of the SiteContent JSON so public pages stay light) ---
function imagesReady(){return once('images',async()=>{await pool().query('CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')})}
export async function saveImage(id:string,mime:string,data:Buffer){await imagesReady();await pool().query('INSERT INTO images(id,mime,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET mime=EXCLUDED.mime,data=EXCLUDED.data',[id,mime,data])}
export async function readImage(id:string):Promise<{mime:string;data:Buffer}|null>{if(!process.env.DATABASE_URL)return null;await imagesReady();const {rows}=await pool().query('SELECT mime,data FROM images WHERE id=$1',[id]);return rows[0]?{mime:rows[0].mime,data:rows[0].data as Buffer}:null}

// --- Customer accounts ---
export type Customer={id:number;name:string;email:string;password_hash:string;created_at:string};
function customersReady(){return once('customers',async()=>{await pool().query('CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')})}
export async function createCustomer(name:string,email:string,passwordHash:string):Promise<Customer>{
  await customersReady();
  const {rows}=await pool().query('INSERT INTO customers(name,email,password_hash) VALUES($1,$2,$3) RETURNING *',[name,email.toLowerCase(),passwordHash]);
  return rows[0] as Customer;
}
export async function getCustomerByEmail(email:string):Promise<Customer|null>{
  await customersReady();
  const {rows}=await pool().query('SELECT * FROM customers WHERE email=$1',[email.toLowerCase()]);
  return (rows[0] as Customer)??null;
}
export async function getCustomerById(id:number):Promise<Customer|null>{
  await customersReady();
  const {rows}=await pool().query('SELECT * FROM customers WHERE id=$1',[id]);
  return (rows[0] as Customer)??null;
}

// --- Loyalty points ledger (balance = sum of events; redemptions are negative) ---
export type PointEvent={id:number;customer_id:number;points:number;reason:string;amount_pennies:number|null;created_at:string};
function pointsReady(){return once('point_events',async()=>{await customersReady();await pool().query('CREATE TABLE IF NOT EXISTS point_events (id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE, points INTEGER NOT NULL, reason TEXT NOT NULL, amount_pennies INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')})}
export async function recordPointEvent(customerId:number,points:number,reason:string,amountPennies:number|null=null){
  await pointsReady();
  await pool().query('INSERT INTO point_events(customer_id,points,reason,amount_pennies) VALUES($1,$2,$3,$4)',[customerId,points,reason,amountPennies]);
}
export async function getPointsBalance(customerId:number):Promise<number>{
  await pointsReady();
  const {rows}=await pool().query('SELECT COALESCE(SUM(points),0)::int AS balance FROM point_events WHERE customer_id=$1',[customerId]);
  return rows[0]?.balance??0;
}
export async function getPointHistory(customerId:number):Promise<PointEvent[]>{
  await pointsReady();
  const {rows}=await pool().query('SELECT * FROM point_events WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 50',[customerId]);
  return rows as PointEvent[];
}
export type CustomerWithPoints=Customer&{balance:number;total_spent_pennies:number};
export async function listCustomersWithPoints():Promise<CustomerWithPoints[]>{
  await pointsReady();
  const {rows}=await pool().query(`SELECT c.*, COALESCE(SUM(pe.points),0)::int AS balance, COALESCE(SUM(pe.amount_pennies),0)::int AS total_spent_pennies
    FROM customers c LEFT JOIN point_events pe ON pe.customer_id=c.id
    GROUP BY c.id ORDER BY c.created_at DESC`);
  return rows as CustomerWithPoints[];
}

// --- Emma's client list (imported from Fresha; these are NOT app accounts) ---
// A client is a contact record Emma owns. When someone registers on the app with a
// matching email, the two are linked so their history and points follow them in.
export type Client={id:number;fresha_id:string|null;first_name:string;last_name:string;full_name:string;phone:string|null;email:string|null;accepts_marketing:boolean;accepts_sms:boolean;fresha_added:string|null;source:string|null;notes:string|null;customer_id:number|null;created_at:string};
function clientsReady(){ return once('clients',async()=>{
  await customersReady(); // clients.customer_id references customers(id)
  await pool().query(`CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    fresha_id TEXT UNIQUE,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    accepts_marketing BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_sms BOOLEAN NOT NULL DEFAULT FALSE,
    fresha_added DATE,
    source TEXT,
    notes TEXT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool().query('CREATE INDEX IF NOT EXISTS clients_email_idx ON clients (lower(email))');
  await pool().query('CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients (phone)');
})}
export type ClientInput=Omit<Client,'id'|'created_at'|'customer_id'|'notes'>&{notes?:string|null};
export async function upsertClient(c:ClientInput):Promise<'inserted'|'updated'>{
  await clientsReady();
  const {rows}=await pool().query(
    `INSERT INTO clients (fresha_id,first_name,last_name,full_name,phone,email,accepts_marketing,accepts_sms,fresha_added,source,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,'')::date,$10,$11)
     ON CONFLICT (fresha_id) DO UPDATE SET
       first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,full_name=EXCLUDED.full_name,
       phone=EXCLUDED.phone,email=EXCLUDED.email,accepts_marketing=EXCLUDED.accepts_marketing,
       accepts_sms=EXCLUDED.accepts_sms,fresha_added=EXCLUDED.fresha_added,source=EXCLUDED.source
     RETURNING (xmax=0) AS inserted`,
    [c.fresha_id,c.first_name,c.last_name,c.full_name,c.phone,c.email,c.accepts_marketing,c.accepts_sms,c.fresha_added??'',c.source,c.notes??null]);
  return rows[0]?.inserted?'inserted':'updated';
}
export type ClientRow=Client&{customer_name:string|null};
export async function listClients(search=''):Promise<ClientRow[]>{
  await clientsReady();
  const like=`%${search.trim().toLowerCase()}%`;
  const {rows}=await pool().query(
    `SELECT cl.*, cu.name AS customer_name FROM clients cl LEFT JOIN customers cu ON cu.id=cl.customer_id
     ${search.trim()?`WHERE lower(cl.full_name) LIKE $1 OR lower(coalesce(cl.email,'')) LIKE $1 OR coalesce(cl.phone,'') LIKE $1`:''}
     ORDER BY cl.full_name LIMIT 500`, search.trim()?[like]:[]);
  return rows as ClientRow[];
}
export async function countClients():Promise<{total:number;linked:number;withEmail:number;marketing:number}>{
  await clientsReady();
  const {rows}=await pool().query(`SELECT count(*)::int AS total,
    count(customer_id)::int AS linked,
    count(nullif(coalesce(email,''),''))::int AS "withEmail",
    count(*) FILTER (WHERE accepts_marketing)::int AS marketing FROM clients`);
  return rows[0] as {total:number;linked:number;withEmail:number;marketing:number};
}
export async function setClientCustomer(clientId:number,customerId:number|null){
  await clientsReady();
  await pool().query('UPDATE clients SET customer_id=$2 WHERE id=$1',[clientId,customerId]);
}
// Called when someone registers: adopt the matching client record, if there is one.
export async function linkClientByEmail(email:string,customerId:number):Promise<boolean>{
  if(!process.env.DATABASE_URL)return false;
  await clientsReady();
  const {rowCount}=await pool().query(
    'UPDATE clients SET customer_id=$2 WHERE customer_id IS NULL AND lower(email)=lower($1)',[email,customerId]);
  return (rowCount??0)>0;
}

// --- Booking requests (Fresha stays the diary; the app only asks) ---
export type BookingStatus='new'|'offered'|'confirmed'|'declined';
export type BookingRequest={id:number;name:string;email:string|null;phone:string;treatment:string;location:string;preferences:string;notes:string|null;status:BookingStatus;client_id:number|null;customer_id:number|null;created_at:string;handled_at:string|null};
function bookingsReady(){ return once('booking_requests',async()=>{
  await clientsReady(); // client_id references clients(id), which itself needs customers
  await pool().query(`CREATE TABLE IF NOT EXISTS booking_requests (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    treatment TEXT NOT NULL,
    location TEXT NOT NULL,
    preferences TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    handled_at TIMESTAMPTZ)`);
  await pool().query('CREATE INDEX IF NOT EXISTS booking_requests_status_idx ON booking_requests (status, created_at DESC)');
})}
export type NewBookingRequest={name:string;email:string|null;phone:string;treatment:string;location:string;preferences:string;notes:string|null;customerId:number|null};
export async function createBookingRequest(r:NewBookingRequest):Promise<BookingRequest>{
  await bookingsReady();
  // Attach it to Emma's existing client record where the phone or email matches.
  const {rows:match}=await pool().query(
    `SELECT id FROM clients
       WHERE ($1 <> '' AND phone = $1)
          OR ($2 <> '' AND lower(email) = lower($2))
       LIMIT 1`,
    [r.phone??'', r.email??'']);
  const clientId=match[0]?.id??null;
  const {rows}=await pool().query(
    `INSERT INTO booking_requests (name,email,phone,treatment,location,preferences,notes,client_id,customer_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [r.name,r.email,r.phone,r.treatment,r.location,r.preferences,r.notes,clientId,r.customerId]);
  return rows[0] as BookingRequest;
}
export type BookingRow=BookingRequest&{client_name:string|null};
export async function listBookingRequests(status?:string):Promise<BookingRow[]>{
  await bookingsReady();
  const where=status&&status!=='all'?'WHERE b.status=$1':'';
  const {rows}=await pool().query(
    `SELECT b.*, c.full_name AS client_name FROM booking_requests b
     LEFT JOIN clients c ON c.id=b.client_id ${where}
     ORDER BY (b.status='new') DESC, b.created_at DESC LIMIT 200`, status&&status!=='all'?[status]:[]);
  return rows as BookingRow[];
}
export async function setBookingStatus(id:number,status:BookingStatus){
  await bookingsReady();
  await pool().query("UPDATE booking_requests SET status=$2, handled_at=CASE WHEN $2='new' THEN NULL ELSE NOW() END WHERE id=$1",[id,status]);
}
export async function countNewBookingRequests():Promise<number>{
  await bookingsReady();
  const {rows}=await pool().query("SELECT count(*)::int AS n FROM booking_requests WHERE status='new'");
  return rows[0]?.n??0;
}

// ---------------------------------------------------------------------------
// Private settings. Kept out of site_content on purpose: GET /api/content is
// public, and things like the address booking alerts go to must not be.
function settingsReady(){return once('app_settings',async()=>{await pool().query('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')})}
export async function getSetting(key:string):Promise<string|null>{
  if(!process.env.DATABASE_URL)return null;
  await settingsReady();
  const {rows}=await pool().query('SELECT value FROM app_settings WHERE key=$1',[key]);
  return rows[0]?.value??null;
}
export async function setSetting(key:string,value:string|null){
  await settingsReady();
  if(value===null||value===''){await pool().query('DELETE FROM app_settings WHERE key=$1',[key]);return}
  await pool().query('INSERT INTO app_settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()',[key,value]);
}
