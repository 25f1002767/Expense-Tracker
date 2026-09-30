import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const links = [
  { to: "/dashboard", label: "Overview", mark: "01" },
  { to: "/transactions", label: "Transactions", mark: "02" },
  { to: "/analytics", label: "Analytics", mark: "03" },
  { to: "/budgets", label: "Budgets", mark: "04" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/dashboard" aria-label="Ledger home">
          <span className="brand-mark">L</span>
          <span><strong>ledger</strong><small>PERSONAL FINANCE</small></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <span className="nav-mark">{link.mark}</span><span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note"><span className="secure-dot" />Your finances, private by default</div>
          <button type="button" className="logout-button" onClick={handleLogout}>Log out <span aria-hidden="true">↗</span></button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">L</span><strong>ledger</strong></div>
          <div className="topbar-spacer" />
          <div className="user-chip"><span className="avatar">{user?.name?.slice(0, 1).toUpperCase()}</span><span className="user-name">{user?.name}</span></div>
        </header>
        <nav className="mobile-nav" aria-label="Main navigation">
          {links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}>{link.label}</NavLink>)}
          <button type="button" className="mobile-nav-link" onClick={handleLogout}>Log out</button>
        </nav>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
