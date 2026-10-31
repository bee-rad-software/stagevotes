/** Resize phone photos locally before sending them through the entry endpoint. */
export async function prepareContestPhoto(file:File):Promise<File> {
 if(file.size>30*1024*1024)throw new Error('This photo is too large to process on your phone. Choose a smaller photo or enter without it.');
 const supported=['image/jpeg','image/png','image/webp'];
 if(supported.includes(file.type)&&file.size<=2*1024*1024)return file;
 const objectUrl=URL.createObjectURL(file);
 try {
  const picture=await new Promise<HTMLImageElement>((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(new Error('Your browser could not open this photo. Try taking a new photo, choosing a JPG, or uploading a screenshot of the picture.'));
   img.src=objectUrl;
  });
  if(!picture.naturalWidth||!picture.naturalHeight)throw new Error('This photo could not be read. Choose another photo.');
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,1600/Math.max(picture.naturalWidth,picture.naturalHeight));
  canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Unable to prepare this photo. Try another photo or enter without it.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(picture,0,0,canvas.width,canvas.height);
  for(const quality of [0.85,0.7,0.55]){
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
   if(blob&&blob.size<=2*1024*1024)return new File([blob],'costume-photo.jpg',{type:'image/jpeg'});
  }
  throw new Error('Unable to shrink this photo enough. Try another photo or enter without it.');
 }finally{URL.revokeObjectURL(objectUrl);}
}
