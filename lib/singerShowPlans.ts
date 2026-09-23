export type SingerShowPlan = { showId: string; date: string };

const metadataKey = 'stagevotes_show_plans';
const storagePrefix = 'stagevotes_show_plans_v1_';

export function isShowPlan(value: unknown): value is SingerShowPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<SingerShowPlan>;
  return typeof plan.showId === 'string' && plan.showId.length > 0 &&
    typeof plan.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(plan.date);
}

export function parseShowPlans(value: unknown): SingerShowPlan[] {
  return Array.isArray(value) ? value.filter(isShowPlan).slice(0, 200) : [];
}

export function mergeShowPlans(...groups: SingerShowPlan[][]): SingerShowPlan[] {
  const plans = new Map<string, SingerShowPlan>();
  groups.flat().forEach((plan) => plans.set(`${plan.showId}:${plan.date}`, plan));
  return [...plans.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-200);
}

export function readLocalShowPlans(identity: string): SingerShowPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseShowPlans(JSON.parse(window.localStorage.getItem(`${storagePrefix}${identity}`) || '[]'));
  } catch {
    return [];
  }
}

export function writeLocalShowPlans(identity: string, plans: SingerShowPlan[]) {
  window.localStorage.setItem(`${storagePrefix}${identity}`, JSON.stringify(plans));
}

export const showPlansMetadataKey = metadataKey;
