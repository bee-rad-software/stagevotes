export function attendanceKey(show:unknown,date:unknown) {
 if(typeof show!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(show))throw Error('Invalid show.');
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid show date.');
 return {show,date};
}
export function validOccurrence(rule:{day_of_week:number;recurrence_type?:string|null;start_date?:string|null},date:string) {
 const d=new Date(date+'T12:00:00Z');if(rule.recurrence_type==='one_time')return date===rule.start_date;
 if(d.getUTCDay()!==rule.day_of_week)return false;
 if(rule.recurrence_type==='biweekly'){if(!rule.start_date)return false;const diff=(Date.parse(date+'T00:00:00Z')-Date.parse(rule.start_date+'T00:00:00Z'))/86400000;return diff>=0&&diff%14===0;}
 return true;
}
