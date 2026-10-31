'use strict';
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const rooms = new Map();
const blank = () => ({level:0, players:[{x:.18,y:.76},{x:.82,y:.76}]});
const server = http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/plain'});res.end('Dois Corações online ♥');});
const wss = new WebSocketServer({server, maxPayload:2048});
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function broadcast(room,obj){for(const p of room.players)if(p)send(p.ws,obj);}
function remove(ws){const r=ws.room;if(!r)return;r.players[ws.player]=null;ws.room=null;broadcast(r,{type:'count',count:r.players.filter(Boolean).length});if(!r.players.some(Boolean))rooms.delete(r.code);}
wss.on('connection',ws=>{
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString())}catch{return}
 if(m.type==='create'||m.type==='join'){
   const code=String(m.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
   if(code.length!==6){send(ws,{type:'error',message:'Código de sala inválido.'});return}
   let r=rooms.get(code);
   if(m.type==='create'){if(r){send(ws,{type:'error',message:'Esse código já está em uso. Crie outra sala.'});return}r={code,players:[null,null],state:blank(),timer:setTimeout(()=>{for(const p of r.players)if(p)p.ws.close();rooms.delete(code)},4*60*60*1000)};rooms.set(code,r)}
   else if(!r){send(ws,{type:'error',message:'Sala não encontrada. Peça um novo código.'});return}
   const slot=r.players.findIndex(x=>!x);if(slot<0){send(ws,{type:'error',message:'A sala já tem duas pessoas.'});return}
   r.players[slot]={ws};ws.room=r;ws.player=slot;send(ws,{type:'joined',room:code,player:slot,state:r.state});broadcast(r,{type:'count',count:r.players.filter(Boolean).length});return;
 }
 if(m.type==='move'&&ws.room){const r=ws.room,p=r.state.players[ws.player];p.x=Math.max(.08,Math.min(.92,Number(m.x)||p.x));p.y=Math.max(.38,Math.min(.86,Number(m.y)||p.y));if(Number.isInteger(m.level))r.state.level=Math.max(r.state.level,Math.min(3,m.level));broadcast(r,{type:'state',state:r.state});}
 });ws.on('close',()=>remove(ws));ws.on('error',()=>remove(ws));
});
server.listen(process.env.PORT||10000,'0.0.0.0',()=>console.log('Dois Corações relay pronto'));
