export type ContestEntry = { id: string; number: number; name: string; costume: string; photo_url: string | null };
export type SideContest = {
 id: string; title: string; mode: 'overall' | 'categories'; status: 'draft' | 'open' | 'closed'; results_visible: boolean;
 categories: {id: string; name: string}[]; entries: ContestEntry[];
 registrations_open?: boolean; pending_entries?: ContestEntry[];
 selections: Record<string,string>; counts: {category_id: string; entry_id: string; votes: number}[] | null;
};
export function contestRanking(contest: SideContest, categoryId: string) {
 const rows = contest.entries.map(entry => ({...entry, votes: Number(contest.counts?.find(c => c.category_id === categoryId && c.entry_id === entry.id)?.votes || 0)}));
 rows.sort((a,b) => b.votes-a.votes || a.number-b.number);
 return rows.map(row => ({...row, rank: 1+rows.filter(other => other.votes > row.votes).length}));
}
