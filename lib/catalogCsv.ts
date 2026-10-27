export type CatalogSong = {title:string;artist:string;explicit:boolean|null};
export function parseCatalogCsv(input:string):CatalogSong[] {
 const text=input.replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/,1)[0];
 let quoted=false, commas=0, semis=0;
 for(let i=0;i<first.length;i++){if(first[i]==='"'){if(quoted&&first[i+1]==='"'){i++;continue;}quoted=!quoted;} else if(!quoted&&first[i]===',')commas++;else if(!quoted&&first[i]===';')semis++;}
 const separator=semis>commas?';':',';
 const rows:string[][]=[];let row:string[]=[],field='',inQuotes=false,afterQuote=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(inQuotes){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{inQuotes=false;afterQuote=true;}}else field+=c;continue;}
  if(c==='"'){if(field.trim()||afterQuote)throw Error('Invalid quote in CSV.');field='';inQuotes=true;continue;}
  if(c===separator){row.push(field);field='';afterQuote=false;continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';afterQuote=false;continue;}
  if(afterQuote&&!/\s/.test(c))throw Error('Unexpected text after a quoted field.');
  if(!afterQuote)field+=c;
 }
 if(inQuotes)throw Error('A quoted field was not closed.');row.push(field);if(row.some(v=>v.trim()))rows.push(row);
 if(rows.length<2)throw Error('Include a header and at least one song.');
 const header=rows[0].map(x=>x.trim().toLowerCase());const ti=header.indexOf('title'),ai=header.indexOf('artist'),ei=header.indexOf('explicit');
 if(ti<0||ai<0)throw Error('Your CSV needs Title and Artist column headers.');
 const songs:CatalogSong[]=[];const seen=new Set<string>();
 for(let i=1;i<rows.length;i++){
  const title=(rows[i][ti]||'').trim(),artist=(rows[i][ai]||'').trim(),value=ei<0?'':(rows[i][ei]||'').trim().toLowerCase();
  if(!title||!artist||title.length>200||artist.length>200)throw Error(`Row ${i+1} needs a title and artist (up to 200 characters each).`);
  if(value&&!['1','0','true','false','yes','no'].includes(value))throw Error(`Row ${i+1}: Explicit must be 1, 0, yes, no, true, false, or blank.`);
  const key=title.toLowerCase()+'\u0000'+artist.toLowerCase();if(seen.has(key))continue;seen.add(key);
  songs.push({title,artist,explicit:value?['1','true','yes'].includes(value):null});
 }
 if(songs.length>20000)throw Error('The limit is 20,000 unique songs per upload.');
 return songs;
}
