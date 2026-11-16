export type ReviewKind='photos'|'shoutouts';
export type ReviewSummary={pending:number;latestAt:string|null};
export const HOST_REVIEW_EVENT='stagevotes-host-review';
export function activityIsNew(summary:ReviewSummary,seen:string|null){
 return summary.pending>0&&Number.isFinite(Date.parse(summary.latestAt||''))&&(!seen||Date.parse(summary.latestAt!)>Date.parse(seen)||!Number.isFinite(Date.parse(seen)));
}
export function submissionAge(iso:string,now:number){
 const timestamp=Date.parse(iso);if(!Number.isFinite(timestamp))return '';
 const seconds=Math.max(0,Math.floor((now-timestamp)/1000));
 if(seconds<60)return 'just now';if(seconds<3600)return `${Math.floor(seconds/60)} min ago`;
 if(seconds<86400)return `${Math.floor(seconds/3600)} hr ago`;
 const days=Math.floor(seconds/86400);return `${days} day${days===1?'':'s'} ago`;
}
