export type Screen = "home" | "finance" | "offline-ai" | "income" | "budgets" | "savings" | "reports" | "investments" | "bank-sync"

export const screens = {
  home: {
    label: "Home",
    corners: {
      "top-left": { label: "Finance", icon: "DollarSign", target: "finance" as Screen },
      "top-right": { label: "Home", icon: "Home", target: "home" as Screen },
      "bottom-left": { label: "Offline AI", icon: "Bot", target: "offline-ai" as Screen },
      "bottom-right": { label: "Raspberry Home", icon: "Monitor", target: null },
    },
  },
  finance: {
    label: "Finance",
    corners: {
      "top-left": { label: "Income / Expenses", icon: "TrendingUp", target: "income" as Screen },
      "top-right": { label: "Budgets", icon: "PieChart", target: "budgets" as Screen },
      "bottom-left": { label: "Investments", icon: "LineChart", target: "investments" as Screen },
      "bottom-right": { label: "Back", icon: "ArrowLeft", target: "home" as Screen },
    },
  },
}
