export async function searchSingaVersions(term: string) {
  const params = new URLSearchParams({search:term,page:'1',page_size:'25',type:'songs',market:'US'});
  const response = await fetch(`https://api.singa.com/v1.4/search/?${params}`);
  if (!response.ok) throw new Error('Singa catalog is unavailable. Please try again.');
  const data = await response.json();
  return (Array.isArray(data.songs?.items) ? data.songs.items : []).flatMap((song:any) =>
    !song.resource_id || !song.name ? [] : (song.variants || []).filter((v:any)=>v.resource_id).map((v:any)=>({
      id:v.resource_id,title:song.name,artist:(song.artists||[]).map((a:any)=>a.name).filter(Boolean).join(', '),
      singaSongId:song.resource_id,singaVariantId:v.resource_id,status:'available' as const,
      note:[v.catalog?.name||'Singa version',v.is_duet?'Duet':'',v.is_explicit?'Explicit':''].filter(Boolean).join(' · ')
    })));
}
export async function findSingaRecommendation(candidate:{title:string;artist:string;reason:string}) {
  const versions = await searchSingaVersions(`${candidate.title} ${candidate.artist}`);
  const norm=(s:string)=>s.trim().toLowerCase();
  const exact=versions.filter((v:any)=>norm(v.title)===norm(candidate.title)&&norm(v.artist)===norm(candidate.artist));
  if (!exact.length) return null;
  const song=exact[0];
  return {...song,reason:candidate.reason,singaVersions:exact.filter((v:any)=>v.singaSongId===song.singaSongId)};
}
