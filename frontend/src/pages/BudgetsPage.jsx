import { useEffect, useState } from "react";
import { api } from "../services/api";
import { EXPENSE_CATEGORIES, currentMonthValue, formatMoney } from "../utils/format";

function monthFields(value) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState({ category: "Food", amount: "" });
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const { year, month: monthNumber } = monthFields(month);
    api.get(`/budgets?month=${monthNumber}&year=${year}`)
      .then((result) => { if (active) { setBudgets(result.budgets); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, reload]);

  function editBudget(budget) {
    setEditingId(budget.id);
    setForm({ category: budget.category, amount: String(budget.amount) });
  }

  function resetForm() {
    setEditingId("");
    setForm({ category: "Food", amount: "" });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Budget amount must be greater than 0."); return; }
    const { year, month: monthNumber } = monthFields(month);
    setSaving(true);
    try {
      const payload = { ...form, amount, year, month: monthNumber };
      if (editingId) await api.put(`/budgets/${editingId}`, payload);
      else await api.post("/budgets", payload);
      resetForm();
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeBudget(budget) {
    if (!window.confirm(`Delete the ${budget.category} budget for this month?`)) return;
    try {
      await api.delete(`/budgets/${budget.id}`);
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="budgets-page">
      <div className="page-heading"><div><p className="eyebrow">SPEND WITH INTENTION</p><h1>Budgets</h1><p className="page-description">Set a monthly guide for the categories that matter.</p></div></div>
      <div className="budget-toolbar"><label className="field month-picker"><span>Budget month</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><p>Spent amounts update from your transactions.</p></div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className="budget-layout">
        <form className="panel budget-form" onSubmit={submit}><p className="eyebrow">{editingId ? "UPDATE A LIMIT" : "SET A LIMIT"}</p><h2>{editingId ? "Edit budget" : "New monthly budget"}</h2><p className="muted-copy">One budget per category, each month.</p>
          <label className="field"><span>Category</span><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="field"><span>Budget amount (₹)</span><input type="number" min="0.01" max="100000000" step="0.01" inputMode="decimal" placeholder="5000" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required /></label>
          <button className="button button-primary full-button" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create budget"}</button>
          {editingId && <button className="text-button cancel-edit" type="button" onClick={resetForm}>Cancel editing</button>}
        </form>
        <section className="panel budget-list-panel"><div className="panel-heading"><div><p className="eyebrow">{month}</p><h2>Category limits</h2></div><span className="budget-count">{budgets.length} {budgets.length === 1 ? "budget" : "budgets"}</span></div>
          {loading ? <div className="loading-panel">Loading budgets…</div> : budgets.length ? <div className="budget-list">{budgets.map((budget) => <article className="budget-row" key={budget.id}>
            <div className="budget-row-top"><div><span className="budget-category-mark">{budget.category.slice(0, 1)}</span><span><strong>{budget.category}</strong><small>{formatMoney(budget.spent)} spent of {formatMoney(budget.amount)}</small></span></div><div className="budget-row-actions"><button type="button" onClick={() => editBudget(budget)}>Edit</button><button type="button" onClick={() => removeBudget(budget)}>Delete</button></div></div>
            <div className="budget-progress-wrap"><div className="progress-track"><span className={`budget-fill ${budget.percentageUsed >= 100 ? "over" : budget.percentageUsed >= 80 ? "near" : ""}`} style={{ width: `${Math.min(budget.percentageUsed, 100)}%` }} /></div><div className="budget-values"><span className={budget.percentageUsed >= 100 ? "expense-text" : ""}>{budget.percentageUsed}% used</span><span>{budget.remaining >= 0 ? `${formatMoney(budget.remaining)} remaining` : `${formatMoney(Math.abs(budget.remaining))} over`}</span></div></div>
            {budget.percentageUsed >= 100 && <p className="budget-warning over-warning">This budget has been exceeded.</p>}{budget.percentageUsed >= 80 && budget.percentageUsed < 100 && <p className="budget-warning">You are approaching this budget.</p>}
          </article>)}</div> : <div className="empty-state budget-empty"><span className="empty-mark">+</span><h3>No budgets for this month</h3><p>Create a category budget to keep an eye on spending.</p></div>}
        </section>
      </div>
    </section>
  );
}
