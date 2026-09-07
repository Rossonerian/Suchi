import 'dotenv/config';
import { createSaasApp } from './app.js';
import { getSaasDatabase } from './database.js';

try {
  const database = getSaasDatabase();
  const app = createSaasApp({ database });
  await database.$queryRaw`SELECT 1`;
  const server = app.listen(Number(process.env.PORT || 5000), () => console.log(JSON.stringify({ event: 'server_started', runtime: 'saas', port: Number(process.env.PORT || 5000) })));
  const shutdown = () => server.close(async () => { await database.$disconnect(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  console.error(JSON.stringify({ event: 'startup_failed', code: error.code || 'CONFIGURATION_OR_DATABASE_UNAVAILABLE' }));
  process.exitCode = 1;
}
