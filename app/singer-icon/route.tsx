import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const runtime='nodejs';
export async function GET(req:Request) {
 const requested=Number(new URL(req.url).searchParams.get('size'));
 const size=[180,192,512].includes(requested)?requested:512;
 const source=await readFile(path.join(process.cwd(),'public','icon-512.png'));
 const png=await sharp(source).resize(size,size,{fit:'contain',background:'#000000'}).flatten({background:'#000000'}).png().toBuffer();
 return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400'}});
}
