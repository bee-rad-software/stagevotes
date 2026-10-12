'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {QRCodeSVG} from 'qrcode.react';
export default function PrintContestEntryQR() {
 const {venueId}=useParams<{venueId:string}>();
 const [url,setUrl]=useState('');
 useEffect(()=>{setUrl(window.location.origin+'/go/venue/'+venueId+'/contest/enter');},[venueId]);
 return <main style={{minHeight:'100vh',background:'#fff',color:'#111',padding:40,textAlign:'center'}}>
  <style>{'@media print { .print-controls { display:none!important; } @page { margin:20mm; } }'}</style>
  <h1>Scan to enter!</h1><h2>People’s Choice Contest</h2>
  {url&&<QRCodeSVG value={url} size={320} marginSize={4}/>}
  <p>Enter your name, costume, and optional photo.</p>
  <p style={{fontSize:12,overflowWrap:'anywhere'}}>{url}</p>
  <div className="print-controls"><p>This venue entry QR code can be reused for future contests.</p>
   <button disabled={!url} onClick={()=>window.print()} style={{padding:'14px 24px',cursor:'pointer'}}>Print QR code</button>
  </div>
 </main>;
}
