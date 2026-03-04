import { Router } from "express";
import db from "../db.js";

const router = Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

const CATEGORIES = {
  expense: ["Food", "Transport", "Housing", "Utilities", "Entertainment", "Health", "Shopping", "Education", "Insurance", "Other"],
  income: ["Salary", "Freelance", "Investment", "Gift", "Refund", "Other"],
};

const SYSTEM_PROMPT = `You are a finance assistant for a personal budget dashboard. 
Your job is to extract structured financial actions from user messages.

You MUST respond with ONLY valid JSON, no other text.

Possible responses:

1. Adding a transaction:
{"action": "add_transaction", "type": "expense|income", "amount": <number>, "category": "<category>", "description": "<description>", "date": "<YYYY-MM-DD or null>"}

2. If you can detect the amount and type but NOT the category, ask:
{"action": "ask_category", "type": "expense|income", "amount": <number>, "description": "<description>", "date": "<YYYY-MM-DD or null>"}

3. Adding to savings:
{"action": "add_savings", "goal_name": "<name>", "amount": <number>}

4. General question or unrelated:
{"action": "chat", "message": "<your helpful response>"}

Expense categories: ${CATEGORIES.expense.join(", ")}
Income categories: ${CATEGORIES.income.join(", ")}

Today's date is ${new Date().toISOString().split("T")[0]}.
Currency is CHF (Swiss Franc).

Examples:
- "I spent 45 on groceries" -> {"action":"add_transaction","type":"expense","amount":45,"category":"Food","description":"groceries","date":"${new Date().toISOString().split("T")[0]}"}
- "Got paid 5000 today" -> {"action":"add_transaction","type":"income","amount":5000,"category":"Salary","description":"monthly salary","date":"${new Date().toISOString().split("T")[0]}"}
- "Paid 120 for something" -> {"action":"ask_category","type":"expense","amount":120,"description":"something","date":"${new Date().toISOString().split("T")[0]}"}
- "Put 200 into vacation fund" -> {"action":"add_savings","goal_name":"vacation fund","amount":200}
- "What's my budget?" -> {"action":"chat","message":"I can help you track expenses and income. Just tell me about your transactions!"}`;

// POST /api/assistant/parse
router.post("/parse", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    let parsed;
    try {
      const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: `${SYSTEM_PROMPT}\n\nUser message: "${message}"\n\nRespond with ONLY JSON:`,
          stream: false,
          options: { temperature: 0.1 },
        }),
      });

      if (!ollamaRes.ok) {
        throw new Error(`Ollama responded with ${ollamaRes.status}`);
      }

      const ollamaData = await ollamaRes.json();
      const responseText = ollamaData.response.trim();

      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (ollamaErr) {
      // Fallback: simple rule-based parsing if Ollama is unavailable
      parsed = fallbackParse(message);
    }

    // If action is add_transaction, actually add it to the database
    if (parsed.action === "add_transaction" && parsed.amount && parsed.category) {
      const stmt = db.prepare(
        "INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)"
      );
      const date = parsed.date || new Date().toISOString().split("T")[0];
      const result = stmt.run(parsed.type, Number(parsed.amount), parsed.category, parsed.description || "", date);
      parsed.transaction_id = result.lastInsertRowid;
      parsed.saved = true;
    }

    // If action is add_savings, add funds to matching goal
    if (parsed.action === "add_savings" && parsed.goal_name && parsed.amount) {
      const goal = db.prepare("SELECT * FROM savings_goals WHERE LOWER(name) LIKE ?").get(`%${parsed.goal_name.toLowerCase()}%`);
      if (goal) {
        const newAmount = goal.current_amount + Number(parsed.amount);
        db.prepare("UPDATE savings_goals SET current_amount = ? WHERE id = ?").run(newAmount, goal.id);
        parsed.saved = true;
        parsed.goal_id = goal.id;
      } else {
        parsed.saved = false;
        parsed.message = `I couldn't find a savings goal matching "${parsed.goal_name}". Would you like to create one?`;
      }
    }

    // Add available categories for ask_category responses
    if (parsed.action === "ask_category") {
      parsed.categories = CATEGORIES[parsed.type] || CATEGORIES.expense;
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple rule-based fallback when Ollama is unavailable
function fallbackParse(message) {
  const lower = message.toLowerCase();

  // Detect amounts
  const amountMatch = lower.match(/(\d+(?:\.\d{1,2})?)\s*(?:chf|francs?)?/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

  // Detect type
  const expenseKeywords = ["spent", "paid", "bought", "cost", "expense", "pay"];
  const incomeKeywords = ["earned", "received", "got paid", "income", "salary", "freelance"];
  const savingsKeywords = ["save", "saving", "put into", "add to fund", "savings"];

  const isExpense = expenseKeywords.some(k => lower.includes(k));
  const isIncome = incomeKeywords.some(k => lower.includes(k));
  const isSavings = savingsKeywords.some(k => lower.includes(k));

  if (isSavings && amount) {
    return { action: "add_savings", goal_name: "general", amount, message: "Which savings goal should I add this to?" };
  }

  if ((isExpense || isIncome) && amount) {
    const type = isIncome ? "income" : "expense";

    // Try to detect category
    const categoryMap = {
      food: ["food", "groceries", "restaurant", "lunch", "dinner", "breakfast", "eat", "meal"],
      transport: ["transport", "gas", "fuel", "bus", "train", "uber", "taxi", "car"],
      housing: ["rent", "mortgage", "housing", "apartment"],
      utilities: ["electricity", "water", "internet", "phone", "utility", "utilities"],
      entertainment: ["movie", "game", "netflix", "spotify", "entertainment", "concert"],
      health: ["doctor", "medicine", "pharmacy", "health", "gym", "fitness"],
      shopping: ["clothes", "shoes", "amazon", "shopping", "store"],
      salary: ["salary", "paycheck", "wage"],
      freelance: ["freelance", "contract", "gig", "project"],
    };

    let category = null;
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(k => lower.includes(k))) {
        category = cat.charAt(0).toUpperCase() + cat.slice(1);
        break;
      }
    }

    if (category) {
      return { action: "add_transaction", type, amount, category, description: message, date: new Date().toISOString().split("T")[0] };
    }

    return { action: "ask_category", type, amount, description: message, date: new Date().toISOString().split("T")[0] };
  }

  return { action: "chat", message: "I can help you track your finances! Try saying something like 'I spent 45 CHF on groceries' or 'I earned 5000 from salary'." };
}

export default router;
