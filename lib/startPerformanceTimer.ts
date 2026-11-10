/** Start once for the selected performance; a stale Play cannot start another singer. */
export async function startPerformanceTimer(client:any,eventId:string,performanceId:string,at=new Date().toISOString()):Promise<string|null>{
 const {data,error}=await client.from('events').update({current_performance_started_at:at})
  .eq('id',eventId).eq('current_performance_id',performanceId)
  .eq('is_show_ended',false).is('show_paused_at',null)
  .is('current_performance_started_at',null).select('current_performance_started_at').maybeSingle();
 if(error)throw error;
 return data?.current_performance_started_at||null;
}
