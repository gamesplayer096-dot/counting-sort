const express=require("express"),http=require("http"),path=require("path");
const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server);
const rooms=new Map(),PORT=process.env.PORT||3000;
app.use(express.static(path.join(__dirname,"public")));

function code(){let s="",c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s}
function key(n){return String(n||"").trim().toLowerCase()}
function rank(r){return [...r.players.values()].sort((a,b)=>b.score-a.score)}

io.on("connection",x=>{
  x.on("createRoom",()=>{
    let c;do{c=code()}while(rooms.has(c));
    rooms.set(c,{host:null,hostOnline:false,players:new Map()});
    const r=rooms.get(c);r.host=x.id;r.hostOnline=true;
    x.join(c);x.room=c;x.isHost=true;x.emit("roomCreated",{room:c});x.emit("ranking",rank(r));
  });

  x.on("reconnectHost",({room})=>{
    const c=String(room||"").toUpperCase().trim(),r=rooms.get(c);
    if(!r)return x.emit("hostError","La sala no existe o ya fue cerrada.");
    r.host=x.id;r.hostOnline=true;x.join(c);x.room=c;x.isHost=true;
    x.emit("hostReconnected",{room:c});x.emit("ranking",rank(r));
  });

  x.on("joinRoom",d=>{
    const c=String(d.room||"").toUpperCase().trim(),n=String(d.name||"").trim(),r=rooms.get(c);
    if(!r)return x.emit("joinError","La sala no existe.");
    if(!n)return x.emit("joinError","Escribe tu nombre.");
    const k=key(n);
    let p=r.players.get(k);
    if(!p)p={name:n,score:0,online:false};
    p.name=n;p.online=true;p.socketId=x.id;r.players.set(k,p);
    x.join(c);x.room=c;x.playerKey=k;
    x.emit("joined",{score:p.score});
    if(r.host)io.to(r.host).emit("ranking",rank(r));
  });

  x.on("levelComplete",d=>{
    const r=rooms.get(String(d.room||"").toUpperCase()),p=r&&r.players.get(x.playerKey);
    if(!p)return;
    p.score=Math.max(p.score,Number(d.score)||0);
    p.tiempo=Number(d.tiempo)||0;p.errores=Number(d.errores)||0;p.level=Number(d.level)||0;
    const rows=rank(r);
    if(r.host)io.to(r.host).emit("ranking",rows);
    x.emit("scoreUpdate",{score:p.score,ranking:rows});
  });

  x.on("closeRoom",({room})=>{
    const c=String(room||"").toUpperCase().trim(),r=rooms.get(c);
    if(r&&r.host===x.id){io.to(c).emit("roomClosed");rooms.delete(c);}
  });

  x.on("disconnect",()=>{
    if(x.room){
      const r=rooms.get(x.room);
      if(r){
        if(x.isHost && r.host===x.id){
          r.hostOnline=false; // NO se borra la sala ni los puntajes.
        } else if(x.playerKey){
          const p=r.players.get(x.playerKey);
          if(p){p.online=false;p.socketId=null;}
          if(r.host)io.to(r.host).emit("ranking",rank(r));
        }
      }
    }
  });
});
server.listen(PORT,()=>console.log("Counting Sort server running on port "+PORT));