export type TrialReminderInfo = {
  state: 'trialing' | 'expired';
  trialEndsAt: string;
  hasPaymentMethod: boolean;
  cancelScheduled: boolean;
};
export function trialReminderCopy(info: TrialReminderInfo, now = Date.now()) {
  const end = Date.parse(info.trialEndsAt);
  if (!Number.isFinite(end)) return null;
  const days = Math.max(0, Math.ceil((end - now) / 86_400_000));
  if (info.state === 'expired') return {
    tone: 'urgent', title: 'Your free trial has ended',
    body: 'Keep your karaoke nights running with StageVotes. Subscribe to restore host access to your account.',
    button: 'Subscribe to StageVotes',
  };
  if (info.cancelScheduled) return {
    tone: days <= 3 ? 'urgent' : 'gentle',
    title: days === 0 ? 'Your trial ends today' : `Your trial ends in ${days} ${days === 1 ? 'day' : 'days'}`,
    body: 'Your subscription is set to end. Open billing to review your options if you want to keep using StageVotes.',
    button: 'Review subscription',
  };
  if (info.hasPaymentMethod) return {
    tone: 'gentle', title: 'You’re ready for your next show',
    body: 'A payment method is on file for your subscription after the trial. You can review the plan or cancel in billing.',
    button: 'Review billing',
  };
  return {
    tone: days <= 3 ? 'urgent' : 'gentle',
    title: days === 0 ? 'Your free trial ends today' : days <= 3
      ? `Only ${days} ${days === 1 ? 'day' : 'days'} left in your free trial`
      : `Your free trial: ${days} days left`,
    body: days <= 3
      ? 'Enjoying StageVotes? Add a payment method before your trial ends to keep running your shows. Without one, your trial expires without a charge.'
      : days <= 7
      ? 'Keep your next karaoke night on the calendar. Add a payment method now to continue on the paid plan after your trial.'
      : 'Try a show, connect KaraFun, and invite your singers. Add a payment method whenever you’re ready to continue after your trial.',
    button: days <= 3 ? 'Keep StageVotes for my next show' : 'Continue after my trial',
  };
}
