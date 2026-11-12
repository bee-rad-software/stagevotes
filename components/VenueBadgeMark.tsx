export default function VenueBadgeMark({icon,color,artworkUrl,size=64}:{icon:string;color?:string;artworkUrl?:string|null;size?:number}){
 return <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:size,height:size,flexShrink:0,borderRadius:'50%',background:(color||'#f97316')+'22',border:`2px solid ${color||'#f97316'}`,fontSize:size*.5,overflow:'hidden'}}>{artworkUrl?<img src={artworkUrl} alt="" style={{width:'85%',height:'85%',objectFit:'contain'}}/>:icon}</span>;
}
