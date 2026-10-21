import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const runtime='nodejs';
export async function GET(req:Request) {
 const requested=Number(new URL(req.url).searchParams.get('size'));
 const size=[180,192,512].includes(requested)?requested:512;
 const source=await readFile(path.join(process.cwd(),'public','icon-512.png'));
 return new ImageResponse(<div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',background:'#000'}}><img src={`data:image/png;base64,${source.toString('base64')}`} alt="" width={Math.round(size*.82)} height={Math.round(size*.82)} style={{objectFit:'contain'}}/></div>,{width:size,height:size,headers:{'Cache-Control':'public, max-age=86400'}});
}
