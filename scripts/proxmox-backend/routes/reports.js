import { Router } from "express";
import db from "../db.js";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import ExcelJS from "exceljs";

const router = Router();

function getMonthData(month) {
  const transactions = db.prepare(
    "SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ? ORDER BY date ASC"
  ).all(month);

  const income = transactions.filter(t => t.type === "income");
  const expenses = transactions.filter(t => t.type === "expense");
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  return { transactions, income, expenses, totalIncome, totalExpenses, net: totalIncome - totalExpenses };
}

// GET /api/reports/:month/csv
router.get("/:month/csv", (req, res) => {
  try {
    const { month } = req.params;
    const data = getMonthData(month);

    let csv = "Date,Type,Category,Description,Amount (CHF)\n";
    data.transactions.forEach(t => {
      const desc = (t.description || "").replace(/"/g, '""');
      csv += `${t.date},${t.type},${t.category},"${desc}",${t.amount.toFixed(2)}\n`;
    });
    csv += `\n,,,,\n`;
    csv += `,,Total Income,,${data.totalIncome.toFixed(2)}\n`;
    csv += `,,Total Expenses,,${data.totalExpenses.toFixed(2)}\n`;
    csv += `,,Net,,${data.net.toFixed(2)}\n`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="report-${month}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:month/pdf
router.get("/:month/pdf", (req, res) => {
  try {
    const { month } = req.params;
    const data = getMonthData(month);

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(`Finance Report - ${month}`, 14, 22);

    // Summary
    doc.setFontSize(11);
    doc.text(`Total Income: CHF ${data.totalIncome.toFixed(2)}`, 14, 35);
    doc.text(`Total Expenses: CHF ${data.totalExpenses.toFixed(2)}`, 14, 42);
    doc.text(`Net: CHF ${data.net.toFixed(2)}`, 14, 49);

    // Table
    const tableData = data.transactions.map(t => [
      t.date,
      t.type.charAt(0).toUpperCase() + t.type.slice(1),
      t.category,
      t.description || "-",
      `CHF ${t.amount.toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 58,
      head: [["Date", "Type", "Category", "Description", "Amount"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [30, 64, 100] },
      styles: { fontSize: 9 },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="report-${month}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:month/excel
router.get("/:month/excel", async (req, res) => {
  try {
    const { month } = req.params;
    const data = getMonthData(month);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Report ${month}`);

    // Header row
    sheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Type", key: "type", width: 10 },
      { header: "Category", key: "category", width: 16 },
      { header: "Description", key: "description", width: 30 },
      { header: "Amount (CHF)", key: "amount", width: 14 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E4064" } };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Data rows
    data.transactions.forEach(t => {
      sheet.addRow({
        date: t.date,
        type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
        category: t.category,
        description: t.description || "-",
        amount: t.amount,
      });
    });

    // Summary rows
    const emptyRow = sheet.addRow({});
    const incomeRow = sheet.addRow({ category: "Total Income", amount: data.totalIncome });
    const expenseRow = sheet.addRow({ category: "Total Expenses", amount: data.totalExpenses });
    const netRow = sheet.addRow({ category: "Net", amount: data.net });
    [incomeRow, expenseRow, netRow].forEach(r => { r.font = { bold: true }; });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="report-${month}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:month/summary
router.get("/:month/summary", (req, res) => {
  try {
    const data = getMonthData(req.params.month);
    res.json({
      month: req.params.month,
      totalIncome: data.totalIncome,
      totalExpenses: data.totalExpenses,
      net: data.net,
      transactionCount: data.transactions.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
