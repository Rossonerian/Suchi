// Entry point: wires up Express, connects to MongoDB, mounts routes.
import 'dotenv/config';
import { connectDB } from './config/db.js';
import { seedTeams } from './seed.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

connectDB()
  .then(seedTeams)
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('[server] failed to start');
    process.exit(1);
  });
