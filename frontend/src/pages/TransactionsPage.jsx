import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatDate, formatMoney } from "../utils/format";

export default function TransactionsPage() {
  const [filters, setFilters] = useState({ search: "", type: "", category: "", from: "", to: "", sort: "newest" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), limit: "12", ...Object.fromEntries(Object.entries(applied).filter(([, value]) => value)) });
    api.get(`/transactions?${query}`).then((data) => { if (active) { setResult(data); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied, page, reload]);

  function update(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    const empty = { search: "", type: "", category: "", from: "", to: "", sort: "newest" };
    setLoading(true);
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  }

  async function remove(id) {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
    try {
      await api.delete(`/transactions/${id}`);
      setLoading(true);
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setApplied({ ...filters });
  }

  return (
    <section className="transactions-page">
      <div className="page-heading"><div><p className="eyebrow">YOUR LEDGER</p><h1>Transactions</h1><p className="page-description">Every rupee in and out, in one place.</p></div><Link to="/add-transaction" className="button button-primary">＋ Add transaction</Link></div>
      <form className="panel filter-panel" onSubmit={applyFilters}>
        <label className="field search-field"><span>Search description</span><input placeholder="Try ‘groceries’" value={filters.search} onChange={(event) => update("search", event.target.value)} /></label>
        <label className="field"><span>Type</span><select value={filters.type} onChange={(event) => update("type", event.target.value)}><option value="">All types</option><option>Income</option><option>Expense</option></select></label>
        <label className="field"><span>Category</span><select value={filters.category} onChange={(event) => update("category", event.target.value)}><option value="">All categories</option>{[...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="field"><span>From</span><input type="date" value={filters.from} onChange={(event) => update("from", event.target.value)} /></label>
        <label className="field"><span>To</span><input type="date" value={filters.to} onChange={(event) => update("to", event.target.value)} /></label>
        <label className="field"><span>Sort by</span><select value={filters.sort} onChange={(event) => update("sort", event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amountDesc">Highest amount</option><option value="amountAsc">Lowest amount</option></select></label>
        <div className="filter-actions"><button type="submit" className="button button-dark">Apply filters</button><button type="button" className="button button-quiet" onClick={clearFilters}>Clear</button></div>
      </form>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <section className="panel transaction-table-panel">
        <div className="table-heading"><div><p className="eyebrow">ACTIVITY</p><h2>{result?.pagination.total ?? 0} entries</h2></div></div>
        {loading ? <div className="loading-panel">Loading transactions…</div> : result?.transactions.length ? <>
          <div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th>Type</th><th className="amount-column">Amount</th><th>Actions</th></tr></thead><tbody>
            {result.transactions.map((transaction) => <tr key={transaction.id}>
              <td><div className="table-description"><span className={`transaction-symbol ${transaction.type.toLowerCase()}`}>{transaction.type === "Income" ? "↙" : "↗"}</span><span><strong>{transaction.description || transaction.category}</strong><small>{formatDate(transaction.date, { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric" })}</small></span></div></td>
              <td><span className="category-label">{transaction.category}</span></td><td>{formatDate(transaction.date)}</td>
              <td><span className={`type-label ${transaction.type.toLowerCase()}`}>{transaction.type}</span></td>
              <td className={`amount-column amount-${transaction.type.toLowerCase()}`}>{transaction.type === "Income" ? "+" : "−"}{formatMoney(transaction.amount)}</td>
              <td><div className="row-actions"><Link to={`/transactions/${transaction.id}/edit`}>Edit</Link><button type="button" onClick={() => remove(transaction.id)}>Delete</button></div></td>
            </tr>)}
          </tbody></table></div>
          <div className="pagination"><span>Page {result.pagination.page} of {Math.max(result.pagination.pages, 1)}</span><div><button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((current) => current - 1); }}>Previous</button><button type="button" disabled={page >= result.pagination.pages} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>Next</button></div></div>
        </> : <div className="empty-state"><span className="empty-mark">—</span><h3>No transactions found</h3><p>{result?.pagination.total ? "Try a different search or clear some filters." : "No transactions yet. Add your first income or expense."}</p>{result?.pagination.total ? <button className="text-button" type="button" onClick={clearFilters}>Clear filters</button> : <Link className="text-link" to="/add-transaction">Add your first transaction <span aria-hidden="true">↗</span></Link>}</div>}
      </section>
    </section>
  );
}
