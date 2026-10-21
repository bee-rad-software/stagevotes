export type MemorySong = {id:string;title:string;artist:string};
export type MemoryBadge = {title:string;icon:string};
export type ShowMemory = {singer:string;show:string;venue:string;date:string;url:string;songs:MemorySong[];badges:MemoryBadge[]};
export function memoryDate(value:string) {
 const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
}
export function uniqueMemoryBadges(badges:MemoryBadge[]) {return [...new Map(badges.map(b=>[b.title,b])).values()];}
export async function renderShowMemory(data:ShowMemory,photo?:string):Promise<Blob> {
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const c=canvas.getContext('2d');if(!c)throw Error('Image creation is unavailable in this browser.');
 c.fillStyle='#07111f';c.fillRect(0,0,1080,1350);
 const glow=c.createLinearGradient(0,0,1080,600);glow.addColorStop(0,'#12344a');glow.addColorStop(1,'#24170e');c.fillStyle=glow;c.fillRect(0,0,1080,600);
 const text=(value:string,x:number,y:number,size:number,color='#f8fafc',weight=700,max=936)=>{c.font=`${weight} ${size}px system-ui, sans-serif`;c.fillStyle=color;let label=value;while(c.measureText(label).width>max && label.length>1)label=label.slice(0,-1);if(label!==value)label=label.slice(0,-1)+'…';c.fillText(label,x,y);};
 text('STAGEVOTES · MY NIGHT ON STAGE',72,90,25,'#7dd3fc',800);
 if(photo){const image=new Image();image.crossOrigin='anonymous';await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>{image.src='';reject(Error('Photo took too long to load. Choose another photo or use no photo.'));},12000);image.onload=()=>{clearTimeout(timeout);resolve();};image.onerror=()=>{clearTimeout(timeout);reject(Error('Could not use that photo. Choose another photo or use no photo.'));};image.src=photo;});
  c.save();c.beginPath();c.roundRect(72,130,936,360,24);c.clip();const scale=Math.max(936/image.naturalWidth,360/image.naturalHeight);const w=image.naturalWidth*scale,h=image.naturalHeight*scale;c.drawImage(image,72+(936-w)/2,130+(360-h)/2,w,h);c.restore();
 }else{c.fillStyle='#0b1b2e';c.beginPath();c.roundRect(72,130,936,360,24);c.fill();text('MY NIGHT',120,280,64);text('ON STAGE',120,365,64,'#fb923c');}
 text(data.singer,72,565,54);text(data.venue,72,615,32,'#7dd3fc');text(memoryDate(data.date),72,653,25,'#cbd5e1',500);text(data.show,72,691,25,'#cbd5e1',500);
 text(`${data.songs.length} SONG${data.songs.length===1?'':'S'} SUNG`,72,753,23,'#fb923c',800);
 data.songs.slice(0,6).forEach((s,i)=>text(`${i+1}. ${s.title}${s.artist?' · '+s.artist:''}`,72,796+i*39,26,'#f1f5f9',600));
 if(data.songs.length>6)text(`+ ${data.songs.length-6} more in my recap`,72,1035,22,'#94a3b8',500);
 if(data.badges.length){text('BADGES EARNED THIS NIGHT',72,1100,21,'#7dd3fc');data.badges.slice(0,4).forEach((b,i)=>{const x=72+(i%2)*470,y=1140+Math.floor(i/2)*48;c.beginPath();c.strokeStyle='#d6a54c';c.lineWidth=2;c.arc(x+16,y-8,18,0,Math.PI*2);c.stroke();text(b.icon,x+3,y,22,'#fde68a',700,34);text(b.title,x+45,y,23,'#fde68a',700,400);});if(data.badges.length>4)text(`+ ${data.badges.length-4} more badges`,72,1230,19,'#94a3b8',500);}
 else text('GOOD SONGS. GREAT MEMORIES.',72,1145,26,'#94a3b8');
 text('Relive the show at StageVotes',72,1270,22,'#fb923c');text(data.url.replace(/^https?:\/\//,''),72,1310,19,'#cbd5e1',500);
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not create the image.')),'image/png'));
}
