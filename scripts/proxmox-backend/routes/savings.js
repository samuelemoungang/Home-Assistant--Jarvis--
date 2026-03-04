import { Router } from "express";
import db from "../db.js";

const router = Router();

// GET /api/savings
router.get("/", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM savings_goals ORDER BY name ASC").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/savings
router.post("/", (req, res) => {
  try {
    const { name, target_amount, current_amount, color } = req.body;

    if (!name || !target_amount) {
      return res.status(400).json({ error: "name and target_amount are required" });
    }

    const stmt = db.prepare(
      "INSERT INTO savings_goals (name, target_amount, current_amount, color) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(name, Number(target_amount), Number(current_amount || 0), color || "#38bdf8");
    const row = db.prepare("SELECT * FROM savings_goals WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/savings/:id - add funds
router.patch("/:id", (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const existing = db.prepare("SELECT * FROM savings_goals WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Savings goal not found" });

    const newAmount = existing.current_amount + Number(amount);
    db.prepare("UPDATE savings_goals SET current_amount = ? WHERE id = ?").run(newAmount, req.params.id);
    const row = db.prepare("SELECT * FROM savings_goals WHERE id = ?").get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/savings/:id
router.put("/:id", (req, res) => {
  try {
    const { name, target_amount, current_amount, color } = req.body;
    db.prepare("UPDATE savings_goals SET name = ?, target_amount = ?, current_amount = ?, color = ? WHERE id = ?")
      .run(name, Number(target_amount), Number(current_amount || 0), color || "#38bdf8", req.params.id);
    const row = db.prepare("SELECT * FROM savings_goals WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Savings goal not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/savings/:id
router.delete("/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM savings_goals WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Savings goal not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
