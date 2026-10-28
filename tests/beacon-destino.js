const { JSDOM, VirtualConsole } = require('jsdom');
const fs=require('fs'); const html=fs.readFileSync(process.argv[2],'utf8');
const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.message||e)));
const stubChart=function(){this.destroy=()=>{};this.toBase64Image=()=>'data:image/png;base64,AA==';this.update=()=>{};}; stubChart.getChart=()=>null; stubChart.defaults={plugins:{},scales:{},color:'',borderColor:'',font:{}};
const ctx=new Proxy({},{get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
const dom=new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|vendor\/)[^"]+"><\/script>/g,''),{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(win){
 win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart;
 win.jspdf={jsPDF:function(){return new Proxy({},{get:(t,k)=>k==='internal'?{pageSize:{getWidth:()=>210,getHeight:()=>297}}:k==='splitTextToSize'?(x)=>[String(x)]:k==='getNumberOfPages'?()=>1:(()=>{})})}};
 win.alert=()=>{}; win.confirm=()=>true; win.scrollTo=()=>{}; win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}});
 win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA==';
 win.URL.createObjectURL=()=> 'blob:x'; win.URL.revokeObjectURL=()=>{}; win.HTMLAnchorElement.prototype.click=function(){};
}});
const w=dom.window; const wait=ms=>new Promise(r=>setTimeout(r,ms));
const out=[];
(async()=>{ await wait(300);
  const rows=[]; const start=new Date(2026,9,26,8,0,0).getTime();
  for(let i=0;i<10;i++){ rows.push({Timestamp:new Date(start+i*300000),User:'svc_mon',SourceIP:'10.10.9.9',Host:'SRV-MON-01',EventID:'4688',Action:'Conexión',Status:'Success',Process:'agente.exe',Destination:'cdn-actualiza.example.org',LogonType:''}); }
  for(let i=0;i<10;i++){ rows.push({Timestamp:new Date(start+i*300000+60000),User:'svc_mon',SourceIP:'10.10.9.9',Host:'SRV-MON-01',EventID:'4688',Action:'Conexión',Status:'Success',Process:'agente.exe',Destination:'10.0.0.5',LogonType:''}); }
  w.generarDemo=()=>rows; await w.loadDemo(); await wait(700);
  const F=w.eval('FINDINGS').filter(f=>f.cat==='Comportamiento periódico');
  out.push('hallazgos periódicos (con destino): '+F.length+' → '+F.map(f=>f.title).join(' | '));
  out.push('ERRORES: '+(errors.length?errors.join(' | '):'ninguno'));
  console.log(out.join('\n')); process.exit(0);
})();
