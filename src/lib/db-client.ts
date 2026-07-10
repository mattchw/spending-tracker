import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// The Neon serverless driver talks over WebSockets. In the Node.js runtime
// (dev, cron, scripts) there's no global WebSocket, so wire up `ws`. On Edge /
// browsers a native WebSocket exists and this is a no-op.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// A pooled connection works for both one-off requests and transactions (the
// HTTP driver can't do transactions, the Pool can).
const pool = new Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });

export { schema };
