import { useContext } from "react";
import SessionContext from "./sessionContext";

export function useAuth() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
