const express=require('express'),http=require('http'),{Server}=require('socket.io');
const app=express(),srv=http.createServer(app),io=new Server(srv);
app.use(express.static(__dirname));
const Q={};
io.on('connection',s=>{
  const leaveQ=()=>{for(const k in Q)Q[k]=Q[k].filter(x=>x.s!==s)};
  const unlink=()=>{const o=s.data.opp;if(o)o.data.opp=null;s.data.opp=null};
  s.on('q',d=>{leaveQ();unlink();const t=+d.t||0,L=Q[t]=Q[t]||[],e=+d.e||800,n=String(d.n||'Gracz').slice(0,24);
    if(L.length){let b=0;L.forEach((x,i)=>{if(Math.abs(x.e-e)<Math.abs(L[b].e-e))b=i});const o=L.splice(b,1)[0],w=Math.random()<.5;
      s.data.opp=o.s;o.s.data.opp=s;
      o.s.emit('start',{c:w?'w':'b',n,oe:e,tm:t});s.emit('start',{c:w?'b':'w',n:o.n,oe:o.e,tm:t})}
    else L.push({s,n,e})});
  s.on('cq',leaveQ);
  s.on('mv',m=>{const o=s.data.opp;if(o)o.emit('mv',{f:+m.f,t:+m.t})});
  s.on('rs',()=>{const o=s.data.opp;if(o)o.emit('rs')});
  s.on('rx',i=>{const o=s.data.opp;if(o)o.emit('rx',+i%6)});
  s.on('disconnect',()=>{leaveQ();const o=s.data.opp;if(o)o.emit('left');unlink()});
});
srv.listen(process.env.PORT||8000,()=>console.log('Szachy Polska: http://localhost:'+(process.env.PORT||8000)));
