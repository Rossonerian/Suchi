// Single responsibility: idempotently make sure the four fixed teams exist.
// Run automatically on server start, and can also be run manually:
//   node seed.js
import { TEAMS } from './constants/teams.js';
import Team from './models/Team.js';
import 'dotenv/config';
import { connectDB } from './config/db.js';

async function seedTeams() {
  for (const team of TEAMS) {
    await Team.findOneAndUpdate(
      { key: team.key },
      { key: team.key, displayName: team.displayName, capacity: team.capacity },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log('[seed] teams ready: core-technical, design-cad, social, documentation');
}

export { seedTeams };

// Allow running directly: `node seed.js`
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  connectDB()
    .then(seedTeams)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] failed');
      process.exit(1);
    });
}
