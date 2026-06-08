#!/usr/bin/env node
/*
 * decrypt.js — Recover the plaintext app from an encrypted index.html.
 * Use this to edit the app later, then re-run encrypt.js.
 *
 * Usage:   node decrypt.js "<password>" [inputFile] [outputFile]
 * Default: node decrypt.js "<password>"   ->   index.html -> app.plain.html
 */
const crypto = require('crypto');
const fs = require('fs');

const password = process.argv[2];
const inFile  = process.argv[3] || 'index.html';
const outFile = process.argv[4] || 'app.plain.html';

if (!password) {
  console.error('Usage: node decrypt.js "<password>" [inputFile] [outputFile]');
  process.exit(1);
}

const html = fs.readFileSync(inFile, 'utf8');
const m = html.match(/const PAYLOAD="([^"]+)"/);
const im = html.match(/const ITER=(\d+)/);
if (!m) { console.error('No encrypted PAYLOAD found in ' + inFile); process.exit(1); }
const iterations = im ? parseInt(im[1], 10) : 200000;

const raw = Buffer.from(m[1], 'base64');
const salt = raw.slice(0, 16);
const iv = raw.slice(16, 28);
const ctAndTag = raw.slice(28);
const ct = ctAndTag.slice(0, ctAndTag.length - 16);
const tag = ctAndTag.slice(ctAndTag.length - 16);

const key = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(tag);
try {
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  fs.writeFileSync(outFile, pt);
  console.log(`Decrypted ${inFile} -> ${outFile}`);
} catch (e) {
  console.error('Decryption failed — wrong password?');
  process.exit(1);
}
