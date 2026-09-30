import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayLocal } from "../utils/format";

function localDateTime(value) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
}

export default function TransactionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: "Expense", amount: "", category: "Food", description: "", date: todayLocal(), time: new Date().toTimeString().slice(0, 5) });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const categories = form.type === "Income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!id) return;
    let active = true;
    api.get(`/transactions/${id}`).then(({ transaction }) => {
      if (!active) return;
      const local = localDateTime(transaction.date);
      setForm({ type: transaction.type, amount: String(transaction.amount), category: transaction.category, description: transaction.description || "", ...local });
    }).catch((requestError) => { if (active) setError(requestError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value, ...(field === "type" ? { category: value === "Income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] } : {}) }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError("Amount must be greater than 0.");
    if (!form.category) return setError("Category is required.");
    if (!form.date || !form.time) return setError("Please choose a date and time.");
    setSaving(true);
    try {
      const payload = { ...form, amount };
      if (id) await api.put(`/transactions/${id}`, payload);
      else await api.post("/transactions", payload);
      navigate("/transactions");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="panel loading-panel">Loading transaction…</div>;

  return (
    <section className="form-page">
      <div className="page-heading"><div><p className="eyebrow">TRANSACTION</p><h1>{id ? "Edit entry" : "Add an entry"}</h1><p className="page-description">Keep the details simple. You can update this later.</p></div></div>
      <form className="panel transaction-form" onSubmit={submit}>
        <div className="field-group"><span className="field-label">Entry type</span><div className="segmented-control">
          {["Expense", "Income"].map((type) => <button key={type} type="button" className={form.type === type ? `segment active ${type.toLowerCase()}` : "segment"} onClick={() => update("type", type)}>{type}</button>)}
        </div></div>
        <div className="form-grid">
          <label className="field"><span>Amount (₹)</span><input autoFocus inputMode="decimal" type="number" min="0.01" step="0.01" max="100000000" placeholder="0.00" value={form.amount} onChange={(event) => update("amount", event.target.value)} required /></label>
          <label className="field"><span>Category</span><select value={form.category} onChange={(event) => update("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="field field-wide"><span>Description <small>Optional</small></span><input maxLength="240" placeholder="e.g. Weekly groceries" value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
          <label className="field"><span>Date</span><input type="date" max={todayLocal()} value={form.date} onChange={(event) => update("date", event.target.value)} required /></label>
          <label className="field"><span>Time</span><input type="time" value={form.time} onChange={(event) => update("time", event.target.value)} required /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => navigate(-1)}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : id ? "Save changes" : "Add transaction"}</button></div>
      </form>
    </section>
  );
}
