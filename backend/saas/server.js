import 'dotenv/config';
import { loadConfig } from './config.js';
import { createSaasApp } from './app.js';
import { getSaasDatabase, closeSaasDatabase } from './database.js';

let server;

async function bootstrap() {
  try {
    const config = loadConfig(process.env);
    const database = getSaasDatabase();
    const app = createSaasApp({ database, env: process.env });

    // Verify initial database connectivity
    await database.$queryRaw`SELECT 1`;

    server = app.listen(config.port, () => {
      console.log(JSON.stringify({
        event: 'server_started',
        service: 'suchi-backend',
        runtime: 'saas',
        port: config.port,
        nodeEnv: config.nodeEnv,
        timestamp: new Date().toISOString(),
      }));
    });

    const shutdown = async (signal) => {
      console.log(JSON.stringify({ event: 'shutdown_initiated', signal, timestamp: new Date().toISOString() }));

      // Stop accepting new connections
      if (server) {
        server.close(async () => {
          try {
            await closeSaasDatabase();
            console.log(JSON.stringify({ event: 'shutdown_completed', signal, timestamp: new Date().toISOString() }));
            process.exit(0);
          } catch (err) {
            console.error(JSON.stringify({ event: 'shutdown_error', error: err.message }));
            process.exit(1);
          }
        });
      } else {
        await closeSaasDatabase();
        process.exit(0);
      }

      // Force exit if shutdown hangs beyond 10 seconds
      setTimeout(() => {
        console.error(JSON.stringify({ event: 'shutdown_timeout_forced_exit' }));
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'startup_failed',
      code: error.code || 'CONFIGURATION_OR_DATABASE_UNAVAILABLE',
      message: error.message,
    }));
    process.exitCode = 1;
  }
}

bootstrap();
