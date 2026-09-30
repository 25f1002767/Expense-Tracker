export const EXPENSE_CATEGORIES = ["Food", "Travel", "Shopping", "Education", "Bills", "Entertainment", "Healthcare", "Rent", "Other"];
export const INCOME_CATEGORIES = ["Salary", "Allowance", "Scholarship", "Gift", "Other"];

export function formatMoney(amount = 0) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(date, options = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-IN", options).format(new Date(date));
}

export function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMonthValue() {
  return todayLocal().slice(0, 7);
}
