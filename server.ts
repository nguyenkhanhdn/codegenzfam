import express from "express";
import path from "node:path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { registerAiRoutes } from "./server/aiRoutes";
dotenv.config();
const app = express();
app.use(express.json({ limit: "128kb" }));
registerAiRoutes(app);
app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    database: "Supabase PostgreSQL",
    authentication: "Supabase Auth",
  }),
);
// Auth and data are served by Supabase; unknown legacy API paths must never return the SPA.
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API đã chuyển sang Supabase." }),
);
if (process.env.NODE_ENV === "production") {
  const dist = path.join(process.cwd(), "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.listen(Number(process.env.PORT) || 3000, "0.0.0.0");
