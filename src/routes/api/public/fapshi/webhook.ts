// Fapshi webhook: kept as a plain helper for the SPA build.
// The browser build does not expose TanStack server handlers, so this is a no-op placeholder.
export async function handleFapshiWebhook(request: Request) {
  if (request.method === "GET") {
    return new Response("Fapshi webhook endpoint", { status: 200 });
  }

  return new Response("Fapshi webhook handling is not available in the SPA build", { status: 501 });
}
