// Twilio WhatsApp notifier — kept as a plain SPA-safe helper.
// The browser build does not run server-side handlers, so this function returns a no-op result.
type Input = { projectId: string; appOrigin: string };

export async function notifyProvidersNewProject(_input: Input) {
  return {
    sent: 0,
    skipped: 0,
    providersFound: 0,
    errors: ["twilio_notifications_disabled_in_spa"],
    details: [] as Array<{ to: string; status?: string; mode: string }>,
  };
}
