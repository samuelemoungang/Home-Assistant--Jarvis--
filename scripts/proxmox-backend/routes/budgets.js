import { Router } from "express";
import db from "../db.js";

const router = Router();

// GET /api/budgets - includes spent amount for current month
router.get("/", (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const budgets = db.prepare("SELECT * FROM budgets ORDER BY category ASC").all();

    const result = budgets.map((budget) => {
      const spent = db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND category = ? AND strftime('%Y-%m', date) = ?"
      ).get(budget.category, month);

      return {
        ...budget,
        spent: spent.total,
        month,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/budgets
router.post("/", (req, res) => {
  try {
    const { category, monthly_limit, color } = req.body;

    if (!category || !monthly_limit) {
      return res.status(400).json({ error: "category and monthly_limit are required" });
    }

    // Upsert: update if category exists, else insert
    const existing = db.prepare("SELECT id FROM budgets WHERE category = ?").get(category);
    if (existing) {
      db.prepare("UPDATE budgets SET monthly_limit = ?, color = ? WHERE id = ?")
        .run(Number(monthly_limit), color || "#38bdf8", existing.id);
      const row = db.prepare("SELECT * FROM budgets WHERE id = ?").get(existing.id);
      return res.json(row);
    }

    const stmt = db.prepare("INSERT INTO budgets (category, monthly_limit, color) VALUES (?, ?, ?)");
    const result = stmt.run(category, Number(monthly_limit), color || "#38bdf8");
    const row = db.prepare("SELECT * FROM budgets WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/budgets/:id
router.put("/:id", (req, res) => {
  try {
    const { category, monthly_limit, color } = req.body;
    db.prepare("UPDATE budgets SET category = ?, monthly_limit = ?, color = ? WHERE id = ?")
      .run(category, Number(monthly_limit), color || "#38bdf8", req.params.id);
    const row = db.prepare("SELECT * FROM budgets WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Budget not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/budgets/:id
router.delete("/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM budgets WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Budget not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
