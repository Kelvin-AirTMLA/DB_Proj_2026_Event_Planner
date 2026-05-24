import { useState, type FormEvent } from "react";
import { apiPost, setAuthToken } from "./api";

export type SessionGuest = {
  role: "guest";
  user_id: number;
  username: string;
  full_name: string;
  email: string;
};

export type SessionOrganizer = {
  role: "organizer";
  organizer_id: number;
  username: string;
  organizer_name: string;
  email: string;
};

export type SessionAccount = SessionGuest | SessionOrganizer;

type GuestAuthResponse = {
  access_token: string;
  token_type: string;
  role: "guest";
  user: Omit<SessionGuest, "role">;
};

type OrganizerAuthResponse = {
  access_token: string;
  token_type: string;
  role: "organizer";
  organizer: Omit<SessionOrganizer, "role">;
};

type AccountKind = "guest" | "organizer";
type AuthMode = "login_email" | "login_username" | "register";

type Props = {
  onAuthed: (account: SessionAccount) => void;
};

export default function AuthGate({ onAuthed }: Props) {
  const [accountKind, setAccountKind] = useState<AccountKind>("guest");
  const [authMode, setAuthMode] = useState<AuthMode>("login_email");
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const handleGuestAuth = (data: GuestAuthResponse) => {
    setAuthToken(data.access_token);
    onAuthed({ role: "guest", ...data.user });
  };

  const handleOrganizerAuth = (data: OrganizerAuthResponse) => {
    setAuthToken(data.access_token);
    onAuthed({ role: "organizer", ...data.organizer });
  };

  const submitGuestEmail = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const data = await apiPost<GuestAuthResponse>("/api/auth/login", { email, password });
      handleGuestAuth(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    }
  };

  const submitGuestUsername = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const data = await apiPost<GuestAuthResponse>("/api/auth/login/username", { username, password });
      handleGuestAuth(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    }
  };

  const submitOrganizerEmail = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const data = await apiPost<OrganizerAuthResponse>("/api/auth/login/organizer", { email, password });
      handleOrganizerAuth(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    }
  };

  const submitOrganizerUsername = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const data = await apiPost<OrganizerAuthResponse>("/api/auth/login/organizer/username", {
        username,
        password,
      });
      handleOrganizerAuth(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    }
  };

  const submitGuestRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const data = await apiPost<GuestAuthResponse>("/api/auth/register", {
        email,
        username,
        full_name: displayName,
        password,
      });
      handleGuestAuth(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Registration failed");
    }
  };

  const submitOrganizerRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const data = await apiPost<OrganizerAuthResponse>("/api/auth/register/organizer", {
        email,
        username,
        organizer_name: displayName,
        password,
      });
      handleOrganizerAuth(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Registration failed");
    }
  };

  const isGuest = accountKind === "guest";

  return (
    <div className="app-shell">
      <header>
        <h1>Event Management — sign in</h1>
        <p className="muted" style={{ margin: "0.35rem 0 0", flex: "1 1 100%" }}>
          Choose <strong>Guest</strong> or <strong>Organizer</strong>, then sign in or register.
        </p>
      </header>
      <div className="panel" style={{ maxWidth: 480 }}>
        <p className="login-step-label">Step 1 — Account type</p>
        <div className="login-role-picker">
          <button
            type="button"
            className={isGuest ? "active" : ""}
            onClick={() => {
              setAccountKind("guest");
              setAuthMode("login_email");
            }}
          >
            <strong>Guest</strong>
            <span>Browse events and book tickets</span>
          </button>
          <button
            type="button"
            className={!isGuest ? "active" : ""}
            onClick={() => {
              setAccountKind("organizer");
              setAuthMode("login_email");
            }}
          >
            <strong>Organizer</strong>
            <span>My stats and door check-in</span>
          </button>
        </div>

        <p className="login-step-label">Step 2 — Email, username, or register</p>

        <nav style={{ marginBottom: "0.75rem" }}>
          <button
            type="button"
            className={authMode === "login_email" ? "active" : "ghost"}
            onClick={() => setAuthMode("login_email")}
          >
            Email
          </button>
          <button
            type="button"
            className={authMode === "login_username" ? "active" : "ghost"}
            onClick={() => setAuthMode("login_username")}
          >
            Username
          </button>
          <button
            type="button"
            className={authMode === "register" ? "active" : "ghost"}
            onClick={() => setAuthMode("register")}
          >
            Register
          </button>
        </nav>

        <p className="muted" style={{ marginTop: 0 }}>
          {isGuest ? (
            <>
              Demo guest: <code>alex.m@student.edu</code> or <code>alex_m</code> / <code>demo123</code>
            </>
          ) : (
            <>
              Demo organizer: <code>hello@nlevents.eu</code> or <code>nle_events</code> / <code>demo123</code>
            </>
          )}
        </p>

        {err && <p className="error">{err}</p>}

        {authMode === "login_email" && (
          <form onSubmit={(e) => void (isGuest ? submitGuestEmail(e) : submitOrganizerEmail(e))}>
            <div className="row">
              <label>
                Email
                <input type="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required />
              </label>
            </div>
            <div className="row">
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  required
                />
              </label>
            </div>
            <button type="submit" className="primary">
              {isGuest ? "Log in as guest" : "Log in as organizer"}
            </button>
          </form>
        )}

        {authMode === "login_username" && (
          <form onSubmit={(e) => void (isGuest ? submitGuestUsername(e) : submitOrganizerUsername(e))}>
            <div className="row">
              <label>
                Username
                <input autoComplete="username" value={username} onChange={(ev) => setUsername(ev.target.value)} required />
              </label>
            </div>
            <div className="row">
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  required
                />
              </label>
            </div>
            <button type="submit" className="primary">
              {isGuest ? "Log in as guest" : "Log in as organizer"}
            </button>
          </form>
        )}

        {authMode === "register" && (
          <form onSubmit={(e) => void (isGuest ? submitGuestRegister(e) : submitOrganizerRegister(e))}>
            <div className="row">
              <label>
                {isGuest ? "Full name" : "Organization / display name"}
                <input value={displayName} onChange={(ev) => setDisplayName(ev.target.value)} required />
              </label>
            </div>
            <div className="row">
              <label>
                Username (unique)
                <input autoComplete="username" value={username} onChange={(ev) => setUsername(ev.target.value)} required />
              </label>
            </div>
            <div className="row">
              <label>
                Email {isGuest ? "" : "(unique)"}
                <input type="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required />
              </label>
            </div>
            <div className="row">
              <label>
                Password (min 8)
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  minLength={8}
                  required
                />
              </label>
            </div>
            <button type="submit" className="primary">
              {isGuest ? "Create guest account" : "Create organizer account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
