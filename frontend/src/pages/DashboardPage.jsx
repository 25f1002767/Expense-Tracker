import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../utils/format";

function daysBack(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function StatCard({ label, value, note, tone }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-dot" /></div><strong>{formatMoney(value)}</strong><small>{note}</small></article>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ from: daysBack(6), to: daysBack(0) });
    Promise.all([api.get("/analytics/summary"), api.get(`/analytics/daily?${query}`)])
      .then(([summary, daily]) => { if (active) { setData(summary); setDays(daily.days); } })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  const maxDaily = Math.max(1, ...days.map((day) => day.income + day.expenses));

  return (
    <div className="dashboard-page">
      <div className="page-heading dashboard-heading"><div><p className="eyebrow">YOUR MONEY, IN PERSPECTIVE</p><h1>Overview</h1><p className="page-description">A clear picture of where things stand.</p></div><Link to="/add-transaction" className="button button-primary">＋ Add transaction</Link></div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {!data && !error ? <div className="panel loading-panel">Loading your finances…</div> : data && <>
        <section className="stats-grid" aria-label="Financial summary">
          <StatCard label="TOTAL INCOME" value={data.totalIncome} note="All recorded income" tone="stat-income" />
          <StatCard label="TOTAL EXPENSES" value={data.totalExpenses} note="All recorded spending" tone="stat-expense" />
          <StatCard label="CURRENT BALANCE" value={data.balance} note={`${data.transactionCount} transactions recorded`} tone="stat-balance" />
        </section>
        <section className="dashboard-grid">
          <article className="panel activity-panel">
            <div className="panel-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>Cash flow</h2></div><div className="chart-legend"><span><i className="legend-income" />Income</span><span><i className="legend-expense" />Expenses</span></div></div>
            {days.length ? <div className="bar-chart" aria-label="Daily income and expense chart for the last seven days">
              {days.map((day) => <div className="bar-day" key={day.date} title={`${day.date}: income ${formatMoney(day.income)}, expenses ${formatMoney(day.expenses)}`}>
                <div className="bar-pair"><span className="bar income-bar" style={{ height: `${Math.max(day.income ? 4 : 0, day.income / maxDaily * 100)}%` }} /><span className="bar expense-bar" style={{ height: `${Math.max(day.expenses ? 4 : 0, day.expenses / maxDaily * 100)}%` }} /></div>
                <small>{formatDate(`${day.date}T12:00:00`, { weekday: "short" })}</small>
              </div>)}
            </div> : <div className="empty-chart">Your daily cash flow will appear here.</div>}
          </article>
          <article className="panel recent-panel">
            <div className="panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent transactions</h2></div><Link className="text-link" to="/transactions">View all <span aria-hidden="true">↗</span></Link></div>
            {data.recentTransactions.length ? <div className="recent-list">{data.recentTransactions.slice(0, 5).map((transaction) => <div className="recent-row" key={transaction.id}>
              <span className={`transaction-symbol ${transaction.type.toLowerCase()}`}>{transaction.type === "Income" ? "↙" : "↗"}</span>
              <span className="recent-description"><strong>{transaction.description || transaction.category}</strong><small>{transaction.category} · {formatDate(transaction.date)}</small></span>
              <strong className={`recent-amount ${transaction.type.toLowerCase()}`}>{transaction.type === "Income" ? "+" : "−"}{formatMoney(transaction.amount)}</strong>
            </div>)}</div> : <div className="empty-state"><span className="empty-mark">01</span><h3>No transactions yet</h3><p>Add your first income or expense to start seeing the picture.</p><Link className="text-link" to="/add-transaction">Add first transaction <span aria-hidden="true">↗</span></Link></div>}
          </article>
        </section>
        <section className="balance-note"><span className="balance-note-mark">↗</span><p><strong>Your balance</strong> is calculated from all recorded income minus all expenses.</p><Link to="/analytics">Explore your analytics <span aria-hidden="true">→</span></Link></section>
      </>}
    </div>
  );
}
