const express=require("express"),http=require("http"),path=require("path");const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server),rooms=new Map(),PORT=process.env.PORT||3000;
app.use(express.static(path.join(__dirname,"public")));
function code(){let s="",c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s}
function rank(r){return [...r.players.values()].sort((a,b)=>b.score-a.score)}
io.on("connection",x=>{
x.on("createRoom",()=>{let c;do{c=code()}while(rooms.has(c));rooms.set(c,{host:x.id,players:new Map()});x.join(c);x.room=c;x.isHost=true;x.emit("roomCreated",{room:c});x.emit("ranking",[])});
x.on("joinRoom",d=>{let c=String(d.room||"").toUpperCase().trim(),n=String(d.name||"").trim(),r=rooms.get(c);if(!r)return x.emit("joinError","La sala no existe.");if(!n)return x.emit("joinError","Escribe tu nombre.");r.players.set(x.id,{name:n,score:0});x.join(c);x.room=c;x.emit("joined");io.to(r.host).emit("ranking",rank(r))});
x.on("levelComplete",d=>{let r=rooms.get(String(d.room||"").toUpperCase()),p=r&&r.players.get(x.id);if(!p)return;p.score=Math.max(p.score,Number(d.score)||0);p.tiempo=Number(d.tiempo)||0;p.errores=Number(d.errores)||0;const rows=rank(r);io.to(r.host).emit("ranking",rows);io.to(x.id).emit("scoreUpdate",{score:p.score,ranking:rows})});
x.on("disconnect",()=>{let r=x.room&&rooms.get(x.room);if(!r)return;if(r.host===x.id)rooms.delete(x.room);else{r.players.delete(x.id);io.to(r.host).emit("ranking",rank(r));}});
});
server.listen(PORT,()=>console.log("Counting Sort server running on port "+PORT));