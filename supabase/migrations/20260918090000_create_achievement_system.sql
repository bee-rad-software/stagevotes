begin;

create table if not exists public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  unlocked_description text not null,
  icon text not null default '🏆',
  category text not null,
  is_secret boolean not null default false,
  criteria_type text not null,
  criteria_config jsonb not null default '{}'::jsonb,
  points integer not null default 10
    check (points >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  active_from timestamptz,
  active_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.singer_achievements (
  id uuid primary key default gen_random_uuid(),

  singer_profile_id uuid not null
    references public.singer_profiles(id)
    on delete cascade,

  achievement_id uuid not null
    references public.achievement_definitions(id)
    on delete cascade,

  triggering_performance_id uuid
    references public.performances(id)
    on delete set null,

  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,

  unique (
    singer_profile_id,
    achievement_id
  )
);

create index if not exists
  singer_achievements_profile_idx
on public.singer_achievements (
  singer_profile_id,
  earned_at desc
);

create index if not exists
  singer_achievements_achievement_idx
on public.singer_achievements (
  achievement_id
);

create index if not exists
  achievement_definitions_active_idx
on public.achievement_definitions (
  is_active,
  sort_order
);

create or replace function
  public.set_achievement_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  set_achievement_definitions_updated_at
on public.achievement_definitions;

create trigger
  set_achievement_definitions_updated_at
before update
on public.achievement_definitions
for each row
execute function
  public.set_achievement_updated_at();

alter table
  public.achievement_definitions
enable row level security;

alter table
  public.singer_achievements
enable row level security;

drop policy if exists
  "Achievement definitions are readable"
on public.achievement_definitions;

create policy
  "Achievement definitions are readable"
on public.achievement_definitions
for select
using (
  is_active = true
  and (
    active_from is null
    or active_from <= now()
  )
  and (
    active_until is null
    or active_until >= now()
  )
);

drop policy if exists
  "Singers can read their achievements"
on public.singer_achievements;

create policy
  "Singers can read their achievements"
on public.singer_achievements
for select
to authenticated
using (
  exists (
    select 1
    from public.singer_profiles
    where singer_profiles.id =
      singer_achievements.singer_profile_id
      and singer_profiles.user_id = auth.uid()
  )
);

revoke insert, update, delete
on public.achievement_definitions
from anon, authenticated;

revoke insert, update, delete
on public.singer_achievements
from anon, authenticated;

grant select
on public.achievement_definitions
to anon, authenticated;

grant select
on public.singer_achievements
to authenticated;

insert into public.achievement_definitions (
  slug,
  title,
  description,
  unlocked_description,
  icon,
  category,
  is_secret,
  criteria_type,
  criteria_config,
  points,
  sort_order
)
values
  (
    'first-performance',
    'First Performance',
    'Complete your first performance.',
    'You officially took the stage!',
    '🎤',
    'Performances',
    false,
    'performance_count',
    '{"count": 1}',
    10,
    10
  ),
  (
    'encore',
    'Encore',
    'Complete 5 performances.',
    'Five performances and the crowd still wants more!',
    '👏',
    'Performances',
    false,
    'performance_count',
    '{"count": 5}',
    20,
    20
  ),
  (
    'ten-song-tour',
    'Ten-Song Tour',
    'Complete 10 performances.',
    'You have reached double digits!',
    '🎶',
    'Performances',
    false,
    'performance_count',
    '{"count": 10}',
    30,
    30
  ),
  (
    'regular-performer',
    'Regular Performer',
    'Complete 25 performances.',
    'You are officially a karaoke regular!',
    '⭐',
    'Performances',
    false,
    'performance_count',
    '{"count": 25}',
    50,
    40
  ),
  (
    'stage-veteran',
    'Stage Veteran',
    'Complete 50 performances.',
    'Fifty performances and still going strong!',
    '🎖️',
    'Performances',
    false,
    'performance_count',
    '{"count": 50}',
    75,
    50
  ),
  (
    'century-club',
    'Century Club',
    'Complete 100 performances.',
    'One hundred performances—legendary!',
    '💯',
    'Performances',
    false,
    'performance_count',
    '{"count": 100}',
    100,
    60
  ),
  (
    'explorer',
    'Explorer',
    'Perform at 3 different venues.',
    'You are taking your voice on the road!',
    '📍',
    'Exploration',
    false,
    'venue_count',
    '{"count": 3}',
    25,
    70
  ),
  (
    'venue-voyager',
    'Venue Voyager',
    'Perform at 5 different venues.',
    'Five venues have heard you sing!',
    '🧭',
    'Exploration',
    false,
    'venue_count',
    '{"count": 5}',
    50,
    80
  ),
  (
    'road-warrior',
    'Road Warrior',
    'Perform at 10 different venues.',
    'You have become a karaoke road warrior!',
    '🚐',
    'Exploration',
    false,
    'venue_count',
    '{"count": 10}',
    100,
    90
  ),
  (
    'crowd-favorite',
    'Crowd Favorite',
    'Average at least 4.5 stars across 3 rated performances.',
    'The crowd clearly loves you!',
    '❤️',
    'Crowd',
    false,
    'average_score',
    '{"minimum": 4.5, "minimum_performances": 3}',
    75,
    100
  ),
  (
    'perfect-score',
    'Perfect Score',
    'Earn a perfect 5.0 score.',
    'A flawless performance!',
    '🌟',
    'Crowd',
    false,
    'perfect_score',
    '{"score": 5}',
    50,
    110
  ),
  (
    'champion',
    'Champion',
    'Win your first competition.',
    'You finished at the top!',
    '🏆',
    'Competition',
    false,
    'win_count',
    '{"count": 1}',
    100,
    120
  ),
  (
    'hat-trick',
    'Hat Trick',
    'Win 3 competitions.',
    'Three victories—what a run!',
    '🎩',
    'Competition',
    false,
    'win_count',
    '{"count": 3}',
    200,
    130
  ),
  (
    'tournament-tested',
    'Tournament Tested',
    'Complete a tournament performance.',
    'You stepped onto the tournament stage!',
    '🥇',
    'Competition',
    false,
    'tournament_performance',
    '{}',
    75,
    140
  ),
  (
    'early-bird',
    'Early Bird',
    'Be one of the first 3 singers in a show.',
    'You got the night started!',
    '🌅',
    'Special Moments',
    false,
    'early_signup',
    '{"maximum_position": 3}',
    25,
    150
  ),
  (
    'friday-night-regular',
    'Friday Night Regular',
    'Perform on 5 different Fridays.',
    'Friday night karaoke is officially your thing!',
    '🪩',
    'Special Moments',
    false,
    'weekday_performance_count',
    '{"weekday": 5, "count": 5}',
    50,
    160
  ),
  (
    'venue-legend',
    'Venue Legend',
    'Perform 25 times at the same venue.',
    'This venue knows your name!',
    '🏠',
    'Exploration',
    false,
    'single_venue_performance_count',
    '{"count": 25}',
    100,
    170
  ),
  (
    'songbook-scholar',
    'Songbook Scholar',
    'Complete 25 different songs.',
    'Your songbook has serious range!',
    '📚',
    'Song Choices',
    false,
    'distinct_song_count',
    '{"count": 25}',
    75,
    180
  ),
  (
    'rickrolled',
    'Never Gonna Give You Up',
    'Secret achievement.',
    'You performed a Rick Astley song. You have officially Rickrolled the room!',
    '🕺',
    'Secret',
    true,
    'artist_match',
    '{"artists": ["rick astley"]}',
    50,
    190
  ),
  (
    'dont-stop-believin',
    'Don''t Stop Believin''',
    'Secret achievement.',
    'You kept the faith and performed the Journey classic!',
    '🚂',
    'Secret',
    true,
    'song_artist_match',
    '{"title": "don''t stop believin''", "artist": "journey"}',
    50,
    200
  ),
  (
    'bohemian-achievement',
    'Bohemian Achievement',
    'Secret achievement.',
    'Is this the real life? You completed Bohemian Rhapsody!',
    '👑',
    'Secret',
    true,
    'song_artist_match',
    '{"title": "bohemian rhapsody", "artist": "queen"}',
    75,
    210
  ),
  (
    'night-owl',
    'Night Owl',
    'Secret achievement.',
    'You took the stage after midnight!',
    '🦉',
    'Secret',
    true,
    'performance_after_hour',
    '{"hour": 0}',
    50,
    220
  ),
  (
    'the-final-countdown',
    'The Final Countdown',
    'Secret achievement.',
    'You performed the final song of the show!',
    '⏳',
    'Secret',
    true,
    'final_performance',
    '{}',
    75,
    230
  ),
  (
    'fearless',
    'Fearless',
    'Secret achievement.',
    'You let StageVotes choose your song!',
    '🎲',
    'Secret',
    true,
    'surprise_song',
    '{}',
    50,
    240
  )
on conflict (slug)
do update set
  title = excluded.title,
  description = excluded.description,
  unlocked_description =
    excluded.unlocked_description,
  icon = excluded.icon,
  category = excluded.category,
  is_secret = excluded.is_secret,
  criteria_type = excluded.criteria_type,
  criteria_config = excluded.criteria_config,
  points = excluded.points,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create or replace view
  public.achievement_badge_stats
with (security_barrier = true)
as
select
  achievement.id as achievement_id,
  achievement.slug,
  count(
    distinct earned.singer_profile_id
  )::bigint as earned_count,
  (
    select count(*)::bigint
    from public.singer_profiles
  ) as total_singers,
  coalesce(
    round(
      (
        count(
          distinct earned.singer_profile_id
        )::numeric
        /
        nullif(
          (
            select count(*)::numeric
            from public.singer_profiles
          ),
          0
        )
      ) * 100,
      1
    ),
    0
  ) as earned_percentage
from public.achievement_definitions
  as achievement
left join public.singer_achievements
  as earned
  on earned.achievement_id =
    achievement.id
group by
  achievement.id,
  achievement.slug;

grant select
on public.achievement_badge_stats
to anon, authenticated;

commit;