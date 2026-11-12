const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
let PGlite;try{({PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite'));}catch{}
// Optional PostgreSQL integration test: npm install --prefix /tmp/badge-db @electric-sql/pglite
// PGLITE_MODULE=/tmp/badge-db/node_modules/@electric-sql/pglite node --test tests/venueBadges.database.cjs
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('venue badge PostgreSQL rules and permissions',{skip:!PGlite},async t=>{
 const db=new PGlite();await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.uid() returns uuid language sql as $$select null::uuid$$;
 create table public.venues(id uuid primary key,account_id uuid,name text);
 create table public.account_users(account_id uuid,user_id uuid,role text);
 create table public.singer_profiles(id uuid primary key,user_id uuid);
 create table public.events(id uuid primary key,venue_id uuid,account_id uuid);
 create table public.performances(id uuid primary key,event_id uuid,singer_profile_id uuid,status text,singer_name text,created_at timestamptz default now());
 create table public.side_contests(id uuid primary key,event_id uuid);
 create table public.side_contest_entries(id uuid primary key,contest_id uuid,singer_profile_id uuid,approval_status text,name text);
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,bucket_id text);alter table storage.objects enable row level security;
 `);
 const migration=fs.readFileSync('supabase/migrations/20261112210000_venue_badges.sql','utf8');
 await db.exec(migration);
 const account=id(1),a=id(2),b=id(3),actor=id(4),singer=id(5),second=id(6);
 await db.query('insert into venues values($1,$2,$3),($4,$2,$5)',[a,account,'Venue A',b,'Venue B']);
 await db.query('insert into account_users values($1,$2,$3)',[account,actor,'host']);
 await db.query('insert into singer_profiles values($1,$2),($3,$4)',[singer,id(7),second,id(8)]);
 for(let n=0;n<6;n++)await db.query('insert into events values($1,$2,$3)',[id(20+n),n===5?b:a,account]);
 const badge=async(n,venue,rule)=>db.query('insert into venue_badges(id,venue_id,title,rule) values($1,$2,$3,$4)',[id(n),venue,rule+' original',rule]);
 await badge(40,a,'song');await badge(41,a,'five_shows');await badge(42,a,'contest_entry');await badge(43,a,'manual');await badge(44,b,'song');
 const perf=async(n,event,profile=singer,status='completed')=>db.query('insert into performances(id,event_id,singer_profile_id,status,singer_name) values($1,$2,$3,$4,$5)',[id(n),event,profile,status,'Singer']);
 const awards=async()=> (await db.query('select * from venue_badge_awards')).rows;
 await t.test('completed activity at another venue cannot award this venue’s badges',async()=>{await perf(60,id(25));const rows=await awards();assert.equal(rows.length,1);assert.equal(rows[0].venue_id,b);});
 await t.test('queued songs do not qualify; repeated completion is idempotent',async()=>{await perf(61,id(20),singer,'queued');assert.equal((await awards()).length,1);await db.query("update performances set status='completed' where id=$1",[id(61)]);await db.query("update performances set status='completed' where id=$1",[id(61)]);assert.equal((await awards()).filter(r=>r.badge_id===id(40)).length,1);});
 await t.test('five different shows at the same venue qualify once',async()=>{for(let n=1;n<4;n++)await perf(61+n,id(20+n));assert.equal((await awards()).filter(r=>r.badge_id===id(41)).length,0);await perf(65,id(24));assert.equal((await awards()).filter(r=>r.badge_id===id(41)).length,1);await perf(66,id(24));assert.equal((await awards()).filter(r=>r.badge_id===id(41)).length,1);});
 await t.test('contest badges require approval and an explicit singer link',async()=>{await db.query('insert into side_contests values($1,$2)',[id(80),id(20)]);await db.query('insert into side_contest_entries values($1,$2,$3,$4,$5)',[id(81),id(80),second,'pending','Contestant']);assert.equal((await awards()).filter(r=>r.badge_id===id(42)).length,0);await db.query("update side_contest_entries set approval_status='approved' where id=$1",[id(81)]);assert.equal((await awards()).filter(r=>r.badge_id===id(42)&&r.singer_profile_id===second).length,1);});
 await t.test('manual awards validate actor, show, and singer; duplicates never mint twice',async()=>{await assert.rejects(db.query('select award_venue_badge_manual($1,$2,$3,$4)',[id(43),singer,id(25),actor]),/show at this venue/);await assert.rejects(db.query('select award_venue_badge_manual($1,$2,$3,$4)',[id(43),singer,id(20),id(999)]),/cannot award/);await assert.rejects(db.query('select award_venue_badge_manual($1,$2,$3,$4)',[id(43),id(999),id(20),actor]),/linked to this show/);await db.query('select award_venue_badge_manual($1,$2,$3,$4)',[id(43),singer,id(20),actor]);await db.query('select award_venue_badge_manual($1,$2,$3,$4)',[id(43),singer,id(20),actor]);assert.equal((await awards()).filter(r=>r.badge_id===id(43)).length,1);});
 await t.test('editing and archiving preserve earned snapshots and stop new awards',async()=>{await db.query("update venue_badges set title='Changed',is_active=false where id=$1",[id(40)]);await perf(67,id(20),second);const rows=(await awards()).filter(r=>r.badge_id===id(40));assert.equal(rows.length,1);assert.equal(rows[0].title,'song original');});
 await t.test('guests cannot mint awards, and rerunning the migration preserves history',async()=>{const privilege=(await db.query("select has_function_privilege('anon','public.award_venue_badge_manual(uuid,uuid,uuid,uuid)','EXECUTE') as allowed,has_table_privilege('authenticated','public.venue_badge_awards','INSERT') as insert_allowed")).rows[0];assert.equal(privilege.allowed,false);assert.equal(privilege.insert_allowed,false);const count=(await awards()).length;await db.exec(migration);assert.equal((await awards()).length,count);});
 await db.close();
});
