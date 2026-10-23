# Venue leagues: director and singer guide

Apply `supabase/migrations/20261023120000_venue_league_seasons.sql` in Supabase SQL Editor. It creates separate `sv_league_*` tables and leaves the earlier global season/points system untouched. The earlier rankings remain at `/leagues/legacy`.

Prerequisites: the existing complete judge ballot / Olympic functions, guest tournament entry migration, and selected-judge scoring view. These are the StageVotes scoring migrations dated October 2 and October 22. The same `scoring_votes` projection used by tournament results supplies league scores, including a selected judge where configured.

## 1. Create the season

Open **Leagues** in the host sidebar, then **Create a league season**. Choose the host account and participating venues. Set a name and dates; start with 6 best nights, a weekly limit of 1, a minimum of 4 counting appearances, and 10 finals spots. Placement awards default to 100, 90, 80, 70, 60, 50, 40, 30, 20, 10. Later places get the final listed award. The optional participation bonus applies to an eligible completed performance, not merely checking in.

Drafts are staff-only. Upcoming and active seasons accept singer entries and appear at `/leagues`. Upcoming seasons become active when their first night is published. Rules lock after the first published night.

A director can copy a private venue invitation code. Another host signs into StageVotes, opens **Leagues**, and connects a venue they own using that code. This grants venue operations, not permission to change the season rules or finish the season. Resetting the invitation invalidates the old code without removing existing participating venues.

## 2. Invite singers

Share the season link. Singers can join with their profile or as a guest. The standings show their singer name and results. Guest receipt tokens remain private and are stored in that browser; signing in from the same browser lets a guest save their entry to a singer profile, including after the season ends. Guests are never merged using a name alone. A profile that already has a separate season entry cannot automatically claim another guest entry.

The singer page includes overall standing, points, required appearances, current qualification status, and a breakdown of kept/dropped nights. A signed-out guest's My leagues list is local to that browser. Only authenticated profile entries follow the singer across devices.

## 3. Run a league night

In the season's **League nights** tab, schedule the venue and local date. You can schedule ahead with no show attached, then connect a judged StageVotes show before scoring starts. A linked night also appears in a collapsible **League nights** section on the host dashboard.

Choose **one counting performance per member** before that performance receives votes. Additional karaoke performances do not automatically earn league points. Nominations are checked against the member's profile, or their guest singer name. Finish the show, then publish the league night. Publication requires all nominated performances to be completed and all configured judge ballots to be complete. Olympic nights require at least five judges and discard the highest and lowest complete judge totals.

A director may deliberately import a historical scored show. This is flagged publicly and requires a reason. Historical nominations also need a reason. Only directors can republish corrected results; the activity log records the actor, reason, and before/after records. Republishing replaces the night's points atomically and cannot double-award points.

## 4. Understand the standings

League points are based on nightly placement, not adding raw judge scores across venues. Tied nightly scores share placement points (two first-place ties mean the next place is third).

Each Monday–Sunday week contributes only the configured number of best nights. The best N remaining results contribute to total points. The appearance minimum also uses nights that survive the weekly limit; playing multiple venues in one week cannot inflate eligibility when the limit is one. Extra results remain visible as **Weekly limit** or **Outside best results**.

Season tiebreakers are total counting points, counting-night wins, then highest counting-night points. Remaining ties share a place. Finals qualification considers only singers who meet the appearance minimum, and includes all singers tied at the cutoff. Standings stay provisional until the director ends the season.

## 5. Finish and seed the final

Publish or cancel all remaining nights. In **Overview → Finish season & qualify singers**, select an optional unlaunched tournament final. Confirm the decision and enter a reason. Qualifiers, including guests, are seeded as eligible tournament entries. Launch and judge the final using the existing tournament workflow. Completed league standings and rules lock; the regular final determines the championship separately.

## Validation

The PGlite PostgreSQL regression suite covers permissions, invitation boundaries, private guest receipts, single-use guest claims, nomination locks, complete ballots, weekly caps, best-N drops, qualification ties, audited corrections, guest finals seeding, completed-season locks, and the real Olympic scoring function. New frontend pages and components pass a focused TypeScript check. The migration still needs to be applied to the live Supabase project before production use.

Run the database tests from the repository root with `node tests/venue-leagues.cjs` after installing `@electric-sql/pglite` without saving it to production dependencies. STAGEVOTES_PGLITE_MODULE, STAGEVOTES_GUEST_SCORING_SQL, and STAGEVOTES_OLYMPIC_SQL can point to separate local installations/sources.
