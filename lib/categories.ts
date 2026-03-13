export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Subscriptions",
  "Entertainment",
  "Health",
  "Shopping",
  "Education",
  "Insurance",
  "Other",
] as const

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Refund",
  "Other",
] as const

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]
