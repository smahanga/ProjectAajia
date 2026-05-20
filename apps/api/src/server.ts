import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

// Bind to 0.0.0.0 so Railway (and other PaaS) can reach the process.
app.listen(config.port, "0.0.0.0", () => {
  console.log(`[api] listening on 0.0.0.0:${config.port}`);
});
