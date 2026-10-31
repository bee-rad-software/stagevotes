export function contestPhotoError(photo: {size:number;type:string}|null):string|null {
 if(!photo)return null;
 if(photo.size>3*1024*1024)return 'That photo is too large. Choose a photo under 3 MB, or remove the photo and enter without it.';
 if(!['image/jpeg','image/png','image/webp'].includes(photo.type))return 'Choose a JPG, PNG, or WebP photo, or remove the photo and enter without it.';
 return null;
}
export async function readContestEntryResponse(response:Response):Promise<{entryId?:string;warning?:string;success?:boolean}> {
 const body=await response.text();
 let result:any;
 try{result=JSON.parse(body);}catch{
  if(response.status===413)throw new Error('That photo is too large to upload. Choose a photo under 3 MB, or enter without a photo.');
  throw new Error('The entry service returned an unexpected response ('+response.status+'). Your entry may have been received. Check with the host before submitting again, or try without the photo.');
 }
 if(!response.ok)throw new Error(typeof result?.error==='string'?result.error:'Unable to submit entry. Please try again.');
 if(result?.success!==true)throw new Error('Unable to confirm your entry. Please check with the host before submitting again.');
 return result;
}
export function contestSubmissionError(error:unknown):string {
 const message=error instanceof Error?error.message:'';
 if(/expected pattern|load failed|failed to fetch|networkerror|network request failed/i.test(message))return 'Your browser could not finish sending the entry. Try again without the photo, or choose a smaller JPG. Your entry may have been received; check with the host before submitting again.';
 return message||'Unable to submit entry. Please try again.';
}
