# Custom tournament scorecards

Apply `supabase/migrations/20261022120000_custom_tournament_scoring.sql` in Supabase SQL Editor before deploying this update.

In Tournament Director, add or edit an unlaunched tournament event. Choose **100-point category scorecard**, name the categories, and allocate their maximum points. The maximums must total exactly 100. Save, then launch the assigned event normally. Each judge enters whole-number scores from zero through the category maximum and submits one complete ballot. Five-star scoring remains the default.

The scorecard is fixed once the event launches. Olympic scoring still requires at least five judges and discards the highest and lowest complete judge totals. Official results continue to apply the configured judge/People's Choice weights. Historical aggregate statistics retain their established normalized five-point scale; the point ballot and official results use the 100-point total.

Raw points are saved in `votes.points_awarded`. The RLS-respecting `scoring_votes` read view supplies weighted, normalized contributions to existing aggregate calculations. Legacy `votes.score` retains its existing integer constraints. New scoring readers require the migration even for legacy shows.

Validation: five automated tests cover rubric validation, unequal category maxima, zero scores, exact normalized totals, and Olympic completion/trimming. All edited TypeScript files parse. Full type checking is limited by missing/current component dependencies in this partial checkout; the migration still needs execution against the Supabase schema.
