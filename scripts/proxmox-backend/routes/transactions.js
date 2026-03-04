import { Router } from "express";
import db from "../db.js";

const router = Router();

// GET /api/transactions?month=YYYY-MM&type=income|expense
router.get("/", (req, res) => {
  try {
    const { month, type } = req.query;
    let sql = "SELECT * FROM transactions";
    const conditions = [];
    const params = [];

    if (month) {
      conditions.push("strftime('%Y-%m', date) = ?");
      params.push(month);
    }
    if (type && (type === "income" || type === "expense")) {
      conditions.push("type = ?");
      params.push(type);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY date DESC, created_at DESC";

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions
router.post("/", (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;

    if (!type || !amount || !category) {
      return res.status(400).json({ error: "type, amount, and category are required" });
    }
    if (type !== "income" && type !== "expense") {
      return res.status(400).json({ error: "type must be 'income' or 'expense'" });
    }

    const stmt = db.prepare(
      "INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)"
    );
    const result = stmt.run(type, Number(amount), category, description || "", date || new Date().toISOString().split("T")[0]);

    const row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/transactions/:id
router.put("/:id", (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    const stmt = db.prepare(
      "UPDATE transactions SET type = ?, amount = ?, category = ?, description = ?, date = ? WHERE id = ?"
    );
    stmt.run(type, Number(amount), category, description || "", date, req.params.id);

    const row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Transaction not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Transaction not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
