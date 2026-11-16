const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');let PGlite;try{({PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite'));}catch{}
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('new shows default to moderated photos and shout-outs without reopening old shows',{skip:!PGlite},async t=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.role() returns text language sql as $$select current_user::text$$;create table events(id uuid primary key,is_show_ended boolean default false);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text);alter table storage.objects enable row level security;`);
 for(const path of ['supabase/migrations/20261021180000_event_photo_gallery.sql','supabase/migrations/20261026190000_show_shoutouts.sql'])await db.exec(fs.readFileSync(path,'utf8'));
 await db.query('insert into events(id) values($1)',[id(1)]);await db.query('insert into show_shoutout_settings(event_id,enabled) values($1,false)',[id(1)]);
 const migration=fs.readFileSync('supabase/migrations/20261116170000_enable_show_audience_features_by_default.sql','utf8');await db.exec(migration);
 await t.test('existing off choices stay off and new event inserts enable both',async()=>{
  assert.equal((await db.query('select photo_sharing_enabled from events where id=$1',[id(1)])).rows[0].photo_sharing_enabled,false);assert.equal((await db.query('select enabled from show_shoutout_settings where event_id=$1',[id(1)])).rows[0].enabled,false);
  await db.query('insert into events(id) values($1)',[id(2)]);assert.equal((await db.query('select photo_sharing_enabled from events where id=$1',[id(2)])).rows[0].photo_sharing_enabled,true);assert.equal((await db.query('select enabled from show_shoutout_settings where event_id=$1',[id(2)])).rows[0].enabled,true);
 });
 await t.test('default-enabled submissions still require host approval',async()=>{
  const photo=(await db.query("select reserve_event_photo($1,'u','n','Caption','Guest','hash') id",[id(2)])).rows[0].id;
  const shout=(await db.query("select submit_show_shoutout($1,'Great song','Guest','u','n') id",[id(2)])).rows[0].id;
  assert.equal((await db.query('select status from event_photos where id=$1',[photo])).rows[0].status,'uploading');assert.equal((await db.query('select status from show_shoutouts where id=$1',[shout])).rows[0].status,'pending');
 });
 await t.test('hosts can turn features off; another venue/show stays enabled',async()=>{
  await db.query('update events set photo_sharing_enabled=false where id=$1',[id(2)]);await db.query('update show_shoutout_settings set enabled=false where event_id=$1',[id(2)]);
  await assert.rejects(db.query("select submit_show_shoutout($1,'No','Guest','u','n')",[id(2)]),/shoutouts_closed/);await assert.rejects(db.query("select reserve_event_photo($1,'u','n','','','h')",[id(2)]),/photos_closed/);
  await db.query('insert into events(id) values($1)',[id(3)]);assert.equal((await db.query('select enabled from show_shoutout_settings where event_id=$1',[id(3)])).rows[0].enabled,true);
 });
 await t.test('authenticated show creation initializes settings without granting direct access',async()=>{
  await db.exec('grant insert on public.events to authenticated;set role authenticated;');
  await db.query('insert into events(id) values($1)',[id(4)]);await db.exec('reset role');
  assert.equal((await db.query('select enabled from show_shoutout_settings where event_id=$1',[id(4)])).rows[0].enabled,true);
 });
 await t.test('ended-show guards still reject submissions',async()=>{
  await db.query('update events set is_show_ended=true where id=$1',[id(3)]);
  await assert.rejects(db.query("select submit_show_shoutout($1,'No','Guest','u','n')",[id(3)]),/shoutouts_closed/);await assert.rejects(db.query("select reserve_event_photo($1,'u','n','','','h')",[id(3)]),/photos_closed/);
 });
 await t.test('migration reruns preserve host off settings; guest writes remain blocked',async()=>{
  await db.exec(migration);assert.equal((await db.query('select enabled from show_shoutout_settings where event_id=$1',[id(2)])).rows[0].enabled,false);
  const privileges=(await db.query("select has_function_privilege('anon','initialize_show_audience_features()','EXECUTE') callable,has_table_privilege('authenticated','show_shoutout_settings','UPDATE') direct_write")).rows[0];assert.equal(privileges.callable,false);assert.equal(privileges.direct_write,false);
 });
 await db.close();
});
