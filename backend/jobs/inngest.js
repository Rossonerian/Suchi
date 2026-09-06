const { Inngest } = require('inngest');
const { getSaasDatabase } = require('../saas/database');
const { runDeadlineSweep } = require('./deadlines');

const inngest = new Inngest({ id: 'nidar-saas' });

const deadlineNotificationSweep = inngest.createFunction(
  { id: 'deadline-notification-sweep', retries: 3, triggers: { cron: '0 * * * *' } },
  async ({ step }) => step.run('scan-deadlines', () => runDeadlineSweep(getSaasDatabase())),
);

module.exports = { inngest, functions: [deadlineNotificationSweep] };
