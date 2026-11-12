export function venueAudienceLink(origin:string,eventId:string,venueId:string|null|undefined,kind:'signup'|'vote'|'people',useStatic=true){
 if(useStatic&&venueId)return `${origin}/go/venue/${venueId}/${kind}`;
 return `${origin}/${kind==='people'?'peopleschoice':kind}/${eventId}`;
}
