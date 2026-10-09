"use client";
import { Loader2 } from "lucide-react";
import Dashboard from "./Dashboard";
import Welcome from "./Welcome";
import { useAuth } from "./AuthProvider";

export default function Workspace() {
  const { user, loading, error, refresh } = useAuth();
  if (loading)
    return (
      <div className="auth-loading" role="status">
        <Loader2 className="spin" />
        Loading…
      </div>
    );
  if (error)
    return (
      <div className="auth-loading">
        <p role="alert">{error}</p>
        <button className="button primary" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  return user ? <Dashboard key={user.id} /> : <Welcome />;
}
