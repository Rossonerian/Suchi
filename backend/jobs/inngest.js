import { Inngest } from 'inngest';
import { getSaasDatabase } from '../saas/database.js';
import { runDeadlineSweep } from './deadlines.js';

const inngest = new Inngest({ id: 'suchi-saas' });

const deadlineNotificationSweep = inngest.createFunction(
  { id: 'deadline-notification-sweep', retries: 3, triggers: { cron: '0 * * * *' } },
  async ({ step }) => step.run('scan-deadlines', () => runDeadlineSweep(getSaasDatabase())),
);

const functions = [deadlineNotificationSweep];
export { inngest, functions };
