#!/usr/bin/env node
/*
 * encrypt.js — Password-protect a static HTML file for free GitHub Pages.
 *
 * Encrypts the plaintext app (app.plain.html) with AES-256-GCM using a key
 * derived from your password via PBKDF2 (200k iterations). Produces a
 * self-contained index.html that prompts for the password and decrypts the
 * real page in the browser using the built-in WebCrypto API (no libraries).
 *
 * The repo can be PUBLIC: the served index.html contains only encrypted
 * ciphertext, so the app is unreadable without the password.
 *
 * Usage:   node encrypt.js "<password>" [inputFile] [outputFile]
 * Default: node encrypt.js "<password>"   ->   app.plain.html -> index.html
 *
 * To recover/edit later: node decrypt.js "<password>"  (index.html -> app.plain.html)
 */
const crypto = require('crypto');
const fs = require('fs');

const password = process.argv[2];
const inFile  = process.argv[3] || 'app.plain.html';
const outFile = process.argv[4] || 'index.html';

if (!password) {
  console.error('Usage: node encrypt.js "<password>" [inputFile] [outputFile]');
  process.exit(1);
}

const plaintext = fs.readFileSync(inFile);
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const iterations = 200000;
const key = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();
// WebCrypto expects ciphertext with the GCM tag appended at the end.
const payload = Buffer.concat([salt, iv, ct, tag]).toString('base64');

const shell = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Budget Smarts</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{--bg:#0a0c0f;--surface:#111318;--surface2:#181c23;--border2:#2a3040;--gold:#c9a84c;--gold-dim:#8a6e2f;--teal:#2dd4bf;--red:#f87171;--text:#e8eaf0;--text-muted:#6b7280;--font-display:'Syne',sans-serif;--font-mono:'DM Mono',monospace;}
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:var(--bg);color:var(--text);font-family:var(--font-mono);min-height:100vh;display:flex;align-items:center;justify-content:center;}
  .card{background:var(--surface);border:1px solid var(--gold-dim);border-radius:12px;padding:48px 40px;max-width:400px;width:90%;text-align:center;}
  .brand{font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--gold);margin-bottom:6px;}
  .brand span{color:var(--teal);}
  .sub{font-size:12px;color:var(--text-muted);margin-bottom:28px;letter-spacing:.5px;}
  input{width:100%;background:var(--bg);border:1px solid var(--border2);border-radius:4px;color:var(--text);font-family:var(--font-mono);font-size:16px;padding:10px 12px;outline:none;text-align:center;letter-spacing:3px;margin-bottom:14px;}
  input:focus{border-color:var(--gold-dim);}
  button{width:100%;font-family:var(--font-display);font-size:13px;letter-spacing:1px;padding:12px 0;border-radius:4px;border:1px solid var(--gold);background:var(--gold);color:#0a0c0f;font-weight:500;cursor:pointer;}
  button:hover{background:#dbb95a;}
  .err{color:var(--red);font-size:11px;margin-top:12px;display:none;}
</style>
</head>
<body>
  <div class="card">
    <div class="brand">BUDGET <span>SMARTS</span></div>
    <div class="sub">Enter your password to continue</div>
    <input type="password" id="pw" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')unlock()">
    <button onclick="unlock()">UNLOCK</button>
    <div class="err" id="err">Incorrect password — please try again.</div>
  </div>
<script>
const PAYLOAD="${payload}";
const ITER=${iterations};
function b64ToBytes(b64){const bin=atob(b64);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
async function unlock(){
  const pw=document.getElementById('pw').value;
  const err=document.getElementById('err');
  try{
    const raw=b64ToBytes(PAYLOAD);
    const salt=raw.slice(0,16), iv=raw.slice(16,28), data=raw.slice(28);
    const enc=new TextEncoder();
    const km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
    const buf=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data);
    const html=new TextDecoder().decode(buf);
    sessionStorage.setItem('bs_unlocked',pw);
    document.open();document.write(html);document.close();
  }catch(e){
    err.style.display='block';
    const i=document.getElementById('pw');
    i.style.borderColor='var(--red)';i.value='';
    setTimeout(()=>{i.style.borderColor='';},1500);
  }
}
// Auto-unlock within the same browser session
(function(){const s=sessionStorage.getItem('bs_unlocked');if(s){document.getElementById('pw').value=s;unlock();}})();
</script>
</body>
</html>`;

fs.writeFileSync(outFile, shell);
console.log(`Encrypted ${inFile} -> ${outFile}`);
console.log(`Payload: ${(payload.length/1024).toFixed(1)} KB | PBKDF2 ${iterations} iters | AES-256-GCM`);
