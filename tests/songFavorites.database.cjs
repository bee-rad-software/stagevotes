const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');let PGlite;try{({PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite'));}catch{}
test('PostgreSQL favorites are private, unique per account, and writable only through service role',{skip:!PGlite},async()=>{
 const db=new PGlite();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select current_setting('request.jwt.claim.sub',true)::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 const sql=fs.readFileSync('supabase/migrations/20261113160000_singer_song_favorites.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.query('insert into auth.users values ($1),($2)',[a,b]);
 await db.query("insert into singer_song_favorites(user_id,song_key,title,artist) values ($1,'hello','Hello','Adele'),($2,'hello','Hello','Adele')",[a,b]);
 await assert.rejects(db.query("insert into singer_song_favorites(user_id,song_key,title,artist) values ($1,'hello','Hello','Adele')",[a]),/unique/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);await db.exec('set role authenticated');
 assert.equal((await db.query('select * from singer_song_favorites')).rows.length,1);assert.equal((await db.query('select user_id from singer_song_favorites')).rows[0].user_id,a);
 await assert.rejects(db.query('delete from singer_song_favorites'),/permission denied/);await assert.rejects(db.query("insert into singer_song_favorites(user_id,song_key,title,artist) values ($1,'x','X','')",[b]),/permission denied/);
 await db.exec('set role anon');await assert.rejects(db.query('select * from singer_song_favorites'),/permission denied/);
 await db.exec('reset role');await db.query('delete from auth.users where id=$1',[a]);assert.equal((await db.query('select user_id from singer_song_favorites')).rows[0].user_id,b);await db.close();
});
