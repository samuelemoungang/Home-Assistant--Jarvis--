import express from "express";
import cors from "cors";
import transactionsRouter from "./routes/transactions.js";
import budgetsRouter from "./routes/budgets.js";
import savingsRouter from "./routes/savings.js";
import reportsRouter from "./routes/reports.js";
import assistantRouter from "./routes/assistant.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// Routes
app.use("/api/transactions", transactionsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/savings", savingsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/assistant", assistantRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pi Dashboard Backend running on http://0.0.0.0:${PORT}`);
  console.log(`Ollama URL: ${process.env.OLLAMA_URL || "http://localhost:11434"}`);
});
