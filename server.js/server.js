const express = require('express')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const app = express()
app.use(express.json())
app.use(express.static('public'))
let sock=null, status='OFFLINE', lastCode='', logs=[]
let OWNER='6285196735043'
function log(t){ logs.push(t); if(logs.length>100) logs.shift(); console.log(t) }
async function startBot(nomor){
  if(sock){ try{sock.end()}catch(e){} }
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('session')
  sock = makeWASocket({ version, logger: pino({level:'silent'}), auth: state, printQRInTerminal:false, browser:['PAPSKY-QUEEN-MD','Chrome','1.0.0'] })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async(u)=>{
    const {connection, lastDisconnect}=u
    if(connection==='open'){ status='ONLINE ✅'; log('✅ CONNECT!') }
    if(connection==='close'){ let c=lastDisconnect?.error?.output?.statusCode; status='OFFLINE - '+c; log('Putus: '+c); if(c!==DisconnectReason.loggedOut) setTimeout(()=>startBot(nomor),5000) }
    if(!sock.authState.creds.registered && nomor){ await new Promise(r=>setTimeout(r,2000)); try{ lastCode=await sock.requestPairingCode(nomor.replace(/[^0-9]/g,'')); status='MENUNGGU PAIRING'; log('KODE: '+lastCode) }catch(e){ log('Gagal: '+e.message) } }
  })
  sock.ev.on('messages.upsert', async({messages})=>{
    const m=messages[0]; if(!m.message||m.key.fromMe) return
    const from=m.key.remoteJid; const text=m.message.conversation||m.message.extendedTextMessage?.text||''
    const cmd=text.trim().split(' ')[0].toLowerCase(); const args=text.trim().split(' ').slice(1).join(' ')
    const reply=(t)=>sock.sendMessage(from,{text:t},{quoted:m})
    if(cmd==='.menu') return reply(`👑 PAPSKY QUEEN 👑\n\n.menu .ping .owner .harga .info\n.ai [tanya]\n.tiktok [link]\n.sticker\n.tagall\n.jodoh .slot\n\nOwner: wa.me/${OWNER}`)
    if(cmd==='.ping') return reply('Pong! PAPSKY QUEEN aktif 👑')
    if(cmd==='.harga') return reply(`HARGA PAPSKY QUEEN\nSEWA 15K/Bulan\nFULL BOT 50K\nOwner: wa.me/${OWNER}`)
    if(cmd==='.owner') return reply('Owner: wa.me/'+OWNER)
    if(cmd==='.ai') return reply('👑 AI QUEEN: '+args)
    if(cmd==='.jodoh') return reply('Jodoh: '+Math.floor(Math.random()*100)+'% cocok! 💘')
    if(cmd==='.slot') return reply('🎰 SLOT QUEEN: Kamu MENANG! 👑')
  })
}
app.get('/api/status',(req,res)=>res.json({status,code:lastCode,logs}))
app.post('/api/start',(req,res)=>{ status='STARTING...'; startBot(req.body.nomor); res.json({ok:true}) })
app.post('/api/stop',(req,res)=>{ if(sock) sock.end(); sock=null; status='STOPPED'; res.json({ok:true}) })
app.post('/api/logout',(req,res)=>{ try{fs.rmSync('session',{recursive:true,force:true})}catch(e){} if(sock) sock.end(); sock=null; status='LOGOUT'; lastCode=''; res.json({ok:true}) })
app.listen(process.env.PORT||3000,()=>log('PANEL JALAN'))
