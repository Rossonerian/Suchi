import express from 'express';
import { GoogleCalendarProvider } from '../integrations/google-calendar.js';
import { requireOrganization } from '../saas/auth-context.js';
import { getSaasDatabase } from '../saas/database.js';
import { startGoogleCalendar, completeGoogleCalendar } from '../saas/integrations.js';
import { AppError } from '../utils/validation.js';

const router = express.Router();

function googleProvider() {
  try {
    return new GoogleCalendarProvider();
  } catch (error) {
    throw new AppError('Google Calendar integration is not configured.', 503, 'INTEGRATION_UNAVAILABLE');
  }
}

router.get('/google/calendar/start', requireOrganization, (req, res, next) => {
  try {
    return res.json(startGoogleCalendar({ provider: googleProvider(), context: req.organizationContext }));
  } catch (error) {
    return next(error);
  }
});

router.get('/google/calendar/callback', async (req, res, next) => {
  try {
    const result = await completeGoogleCalendar({ db: getSaasDatabase(), provider: googleProvider(), state: req.query.state, code: req.query.code });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get('/google/calendar/status', requireOrganization, async (req, res, next) => {
  try {
    const connection = await getSaasDatabase().integrationConnection.findUnique({ where: { organizationId_provider: { organizationId: req.organizationContext.organizationId, provider: 'google_calendar' } }, select: { status: true, updatedAt: true } });
    return res.json({ connected: Boolean(connection && connection.status === 'connected'), status: connection?.status || 'disconnected', updatedAt: connection?.updatedAt || null });
  } catch (error) {
    return next(error);
  }
});

export default router;
