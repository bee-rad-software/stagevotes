export const HOST_SIGNUP_RECIPIENT = 'brad@stagevotes.com';
export type SignupPayload = { accountName?: string | null; email?: string | null; status?: string | null; createdAt?: string | null };

export function signupNotificationText(payload: SignupPayload) {
  return [
    'A new StageVotes host account was created.', '',
    'Account / business: ' + (payload.accountName || 'Not provided'),
    'Owner email: ' + (payload.email || 'Not provided'),
    'Status at signup: ' + (payload.status || 'incomplete'),
    'Created: ' + (payload.createdAt || 'Not available'), '',
    'An incomplete account has not activated its trial yet. Venue details may still be added during onboarding.', '',
    'StageVotes: https://app.stagevotes.com',
  ].join('\n');
}

export async function sendHostSignupNotification(accountId: string, payload: SignupPayload) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.SIGNUP_NOTIFICATION_FROM;
  if (!key || !from) throw new Error('Email notification configuration is missing.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json',
      'Idempotency-Key': 'host-signup/' + accountId },
    body: JSON.stringify({ from, to: [HOST_SIGNUP_RECIPIENT],
      subject: 'New StageVotes host account', text: signupNotificationText(payload) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Email provider returned HTTP ' + response.status);
  const result = await response.json();
  if (typeof result.id !== 'string' || !result.id) throw new Error('Email provider did not return an ID.');
  return result.id as string;
}
