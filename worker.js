import handler from "./dist/_worker.js/index.js";

export default {
  async fetch(request, env, ctx) {
    return handler.fetch(request, env, ctx);
  },
  async scheduled(_event, env, ctx) {
    const secret = env.CRON_SECRET;
    if (!secret) {
      console.error("CRON_SECRET is not configured");
      return;
    }

    const requestObj = new Request("http://localhost/sam-admin/api/media/gc", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`
      }
    });

    try {
      const response = await handler.fetch(requestObj, env, ctx);
      console.log(`GC Execution Response: ${response.status} - ${await response.text()}`);
    } catch (err) {
      console.error("Failed to run scheduled garbage collection:", err);
    }
  }
};
