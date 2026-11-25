const express=require('express'),http=require('http'),{Server}=require('socket.io');
const app=express(),srv=http.createServer(app),io=new Server(srv);
const {OAuth2Client}=require('google-auth-library'),fs=require('fs'),crypto=require('crypto');
const CID='567888581539-hugfts5f2sght90bmsa5n54qimafbii4.apps.googleusercontent.com',gc=new OAuth2Client(CID);
const FILE=process.env.DATA_FILE||__dirname+'/data.json';
let DB={users:{},sess:{}};try{DB=JSON.parse(fs.readFileSync(FILE))}catch(e){}
let dirty=0;const flush=()=>{if(dirty){dirty=0;try{fs.writeFileSync(FILE,JSON.stringify(DB))}catch(e){}}};setInterval(flush,5000);process.on('SIGTERM',()=>{flush();process.exit(0)});
app.use(express.json({limit:'50kb'}));
const clean=x=>String(x||'').replace(/[<>&"'`]/g,'').slice(0,40);
const num=(v,a,b,d)=>Number.isFinite(+v)?Math.min(b,Math.max(a,Math.round(+v))):d;
const ids=new Set([...Array(30).keys()].map(i=>'s'+i).concat([...Array(20).keys()].map(i=>'a'+i)));
function sane(p){const own=Array.isArray(p.own)?[...new Set(p.own.filter(x=>ids.has(x)))]:[];['s0','a0'].forEach(x=>{if(!own.includes(x))own.push(x)});
  return{elo:num(p.elo,100,3500,800),xp:num(p.xp,0,1e7,0),pts:num(p.pts,0,1e7,300),own,s:own.includes(p.s)&&p.s[0]=='s'?p.s:'s0',a:own.includes(p.a)&&p.a[0]=='a'?p.a:'a0',w:num(p.w,0,1e6,0),g:num(p.g,0,1e6,0),st:num(p.st,0,1e4,0)}}
const pic=x=>/^https:\/\//.test(x||'')?x:'';
app.post('/api/login',async(req,res)=>{try{const j=(await gc.verifyIdToken({idToken:String(req.body.cred),audience:CID})).getPayload(),id=j.sub;
  let u=DB.users[id];if(!u)u=DB.users[id]={n:clean(j.name)||'Gracz',img:pic(j.picture),p:sane(req.body.local||{})};else{u.n=clean(j.name)||u.n;u.img=pic(j.picture)||u.img}
  const sid=crypto.randomBytes(24).toString('hex');DB.sess[sid]=id;dirty=1;res.json({sid,n:u.n,img:u.img,p:u.p})}catch(e){res.json({err:'Logowanie Google nie powiodło się'})}});
app.post('/api/save',(req,res)=>{const id=DB.sess[req.body.sid],u=id&&DB.users[id];if(!u)return res.status(401).json({});u.p=sane(req.body.p||{});dirty=1;res.json({ok:1})});
app.get('/api/rank',(req,res)=>{const me=DB.sess[req.get('x-sid')];res.json(Object.entries(DB.users).map(([id,u])=>({n:u.n,img:u.img,...u.p,oc:u.p.own.length,lv:Math.floor(Math.sqrt(u.p.xp/40))+1,me:id===me})).sort((a,b)=>b.elo-a.elo).slice(0,50).map(({own,pts,...x})=>x))});
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
