import { createApp } from "./app.js";

export function startServer(port) {
  const app = createApp();
  return app.listen(port, () => {
    process.stdout.write(`Urban Air Assistant running on port ${port}\n`);
  });
}

/* v8 ignore next 3 */
if (process.env.NODE_ENV !== "test") {
  startServer(process.env.PORT || 8080);
}
