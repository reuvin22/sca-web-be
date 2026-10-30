import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import v1Routes from "./routes/v1.routes";

const app = express();

// Security headers, CORS (frontend only), and JSON body parsing (with a size limit).
// Content-Disposition is exposed so the frontend can read the file name on downloads.
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, exposedHeaders: ["Content-Disposition"] }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok" });
});

app.use("/api/v1", v1Routes);

// These must stay last.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
