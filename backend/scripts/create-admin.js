import readline from 'node:readline';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();
import Team from '../models/Team.js';
import Member from '../models/Member.js';
import { connectDB } from '../config/db.js';
import { parseEmail } from '../utils/validation.js';
import { hashPassword } from '../utils/passwords.js';
import { revokeAllSessions } from '../utils/auth.js';

function question(rl, prompt) { return new Promise((resolve) => rl.question(prompt, resolve)); }

async function promoteExistingAdmin(existing, { name, team, passwordHash }) {
  const conflictingName = await Member.findOne({ nameLower: name.toLowerCase(), _id: { $ne: existing._id } }).select('_id');
  if (conflictingName) throw new Error('Another member already uses that name.');
  existing.name = name;
  existing.team = team._id;
  existing.role = 'admin';
  existing.status = 'active';
  existing.passwordHash = passwordHash;
  await existing.save();
  await revokeAllSessions(existing._id);
  return existing;
}

async function hiddenQuestion(rl, prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error('An interactive terminal is required to enter the admin password safely.');
  }
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  return new Promise((resolve) => {
    let value = '';
    const onData = (chunk) => {
      const key = chunk.toString();
      if (key === '\n' || key === '\r' || key === '\u0004') {
        process.stdin.setRawMode(false); process.stdin.off('data', onData); process.stdout.write('\n'); resolve(value); return;
      }
      if (key === '\u0003') { process.stdin.setRawMode(false); process.exit(1); }
      if (key === '\u007f') value = value.slice(0, -1); else if (key.length === 1) value += key;
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const name = (await question(rl, 'Name: ')).trim();
    const email = parseEmail((await question(rl, 'Email: ')).trim());
    const teamKey = (await question(rl, 'Team key: ')).trim();
    const password = await hiddenQuestion(rl, 'Password (min 10 chars): ');
    const team = await Team.findOne({ key: teamKey });
    if (!team) throw new Error('Unknown team key.');
    const passwordHash = await hashPassword(password);
    const existing = await Member.findOne({ email });
    if (existing) {
      await promoteExistingAdmin(existing, { name, team, passwordHash });
    } else {
      await Member.create({ name, email, team: team._id, role: 'admin', status: 'active', passwordHash });
    }
    console.log('Admin account ready.');
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) connectDB().then(main).catch(() => { console.error('[create-admin] failed'); process.exitCode = 1; });

export { main, promoteExistingAdmin };
