# Guest tournament results

Apply `supabase/migrations/20261022170000_guest_tournament_results.sql` before using this change. Then run `repair_rogers_qualifier.sql` to rebuild the affected qualifier from the saved votes. The repair refuses ambiguous event names, missing required judge ballots, or a destination show that has already launched. It does not change votes, create singer accounts, or reduce the expected judge count.

Guest competitors have nullable singer_profile_id and an event-scoped guest identity on tournament_entries. Performances retain their tournament_entry_id when seeded into a later round. Guest names appear in results, TV presentation, director controls, public brackets, and championship standings. Current name-based guest identification follows the singer-name identity already used by the queue and audience voting; guests from separate qualifiers are not merged automatically.

Only completed performances with a song are eligible for official rankings. Required complete ballots are checked before ending a tournament, including non-Olympic tournaments. Zero-point ballots are valid; missing scores are not treated as zero. Finalization replaces the qualifier's previous placements and unstarted downstream advancements atomically, and updates the recap's judge winner.

Validation: the SQL executes in a PGlite PostgreSQL runtime against a representative schema. Regression fixtures cover Catie/Bob guest ranking, excluding queued/skipped Brad/Jen, removing Brad's erroneous advancement, recap correction, idempotent repair, missing ballots, real zero scores, and protecting launched downstream rounds. This does not substitute for applying the migration against the live Supabase schema and policies.

To rerun: install @electric-sql/pglite without saving it to package dependencies, then run `node tests/guest-tournament-results.cjs` from the repository root. The optional STAGEVOTES_PGLITE_MODULE environment variable can point at a separate installation.
