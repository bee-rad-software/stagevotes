import {validatePointCategories,type PointCategory} from '@/lib/tournamentScoring';
import { supabase } from '@/lib/supabase';

type CreateStageVotesEventInput = {
  scoringCategories?: PointCategory[];
  accountId: string;
  venueId?: string;
  venueName: string;
  name: string;
  judgingEnabled: boolean;
  categories: string[];
  tiebreakerCategory?: string;
  showSignupQR: boolean;
  showVotingQR: boolean;
  showPeoplesChoiceQR: boolean;
};

type CreateStageVotesEventResult = {
  eventId: string;
};

export async function createStageVotesEvent({
  scoringCategories,
  accountId,
  venueId,
  venueName,
  name,
  judgingEnabled,
  categories,
  tiebreakerCategory,
  showSignupQR,
  showVotingQR,
  showPeoplesChoiceQR,
}: CreateStageVotesEventInput): Promise<CreateStageVotesEventResult> {
  const pointRubric=scoringCategories?validatePointCategories(scoringCategories):null;
  if(pointRubric&&!judgingEnabled)throw Error('This tournament requires judging for its 100-point scorecard.');
  const cleanName = name.trim();
  const cleanVenueName = venueName.trim();

  const validCategories = (pointRubric ? pointRubric.map(c=>c.name) : categories)
    .map((category) => category.trim())
    .filter(Boolean);

  if (!accountId) {
    throw new Error('Your StageVotes account could not be found.');
  }

  if (!cleanName) {
    throw new Error('Please enter a show name.');
  }

  if (!cleanVenueName) {
    throw new Error('Please select a venue.');
  }

  if (judgingEnabled && validCategories.length === 0) {
    throw new Error(
      'Please add at least one voting category.'
    );
  }

  const {
    data: event,
    error: eventError,
  } = await supabase
    .from('events')
    .insert({
      ...(pointRubric?{scoring_mode:'points'}:{}),
      name: cleanName,
      venue: cleanVenueName,
      venue_id: venueId || null,
      account_id: accountId,

      judging_enabled: judgingEnabled,

      tiebreaker_category_name: judgingEnabled
        ? tiebreakerCategory || validCategories[0]
        : null,

      show_signup_qr: showSignupQR,

      show_voting_qr:
        judgingEnabled && showVotingQR,

      show_peoples_choice_qr:
        showPeoplesChoiceQR,
    })
    .select('id')
    .single();

  if (eventError) {
    throw eventError;
  }

  if (!event) {
    throw new Error(
      'Your show could not be created. Please try again.'
    );
  }

  if (
    judgingEnabled &&
    validCategories.length > 0
  ) {
    const { error: categoryError } =
      await supabase
        .from('vote_categories')
        .insert(
          validCategories.map((category,index) => ({
            ...(pointRubric?{max_points:pointRubric[index].maxPoints}:{}),
            event_id: event.id,
            category_name: category,
          }))
        );

    if (categoryError) {
      throw categoryError;
    }
  }

  return {
    eventId: event.id,
  };
}
