import { useEffect, useState } from "react";
import SessionContext from "./sessionContext";
import { api } from "../services/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/auth/me")
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function login(credentials) {
    const result = await api.post("/auth/login", credentials);
    setUser(result.user);
    return result.user;
  }

  async function register(details) {
    const result = await api.post("/auth/register", details);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Clear local session state even if the API is temporarily unreachable.
    } finally {
      setUser(null);
    }
  }

  return <SessionContext.Provider value={{ user, loading, login, register, logout }}>{children}</SessionContext.Provider>;
}
