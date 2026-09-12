import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSession, sbGetUser, sbSignIn, sbSignOut } from "../lib/supabase.js";

const AuthContext = createContext(null);

function normalizeRole(role) {
  return role === "admin" || role === "editor" || role === "viewer" ? role : "viewer";
}

// Roles are read from trusted Supabase auth metadata. The client must never
// default to admin: database RLS remains the final authorization boundary.
export function getUserRole(user) {
  if (!user) return "viewer";
  return normalizeRole(
    (user.app_metadata && user.app_metadata.role) ||
    (user.user_metadata && user.user_metadata.role)
  );
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(function () {
    var active = true;
    var stored = getSession();
    if (!stored) { setAuthLoading(false); return function () { active = false; }; }
    sbGetUser(stored.access_token).then(function (nextUser) {
      if (!active) return;
      if (nextUser && nextUser.id) {
        setSession(stored);
        setUser(nextUser);
      } else {
        setSession(null);
        setUser(null);
      }
    }).catch(function () {
      if (active) { setSession(null); setUser(null); }
    }).finally(function () {
      if (active) setAuthLoading(false);
    });
    return function () { active = false; };
  }, []);

  useEffect(function () {
    function onExpired() {
      setSession(null); setUser(null);
    }
    window.addEventListener("hm-auth-expired", onExpired);
    return function () { window.removeEventListener("hm-auth-expired", onExpired); };
  }, []);

  async function login(email, password) {
    var nextSession = await sbSignIn(email, password);
    localStorage.setItem("hm_session", JSON.stringify(nextSession));
    var nextUser = nextSession.user || await sbGetUser(nextSession.access_token);
    setSession(nextSession);
    setUser(nextUser || null);
    return nextSession;
  }

  async function logout() {
    await sbSignOut(session && session.access_token);
    setSession(null); setUser(null);
  }

  var role = getUserRole(user || (session && session.user));
  var value = useMemo(function () {
    return {
      session: session,
      user: user,
      userRole: role,
      authLoading: authLoading,
      canEdit: role === "admin" || role === "editor",
      canDelete: role === "admin",
      isAdmin: role === "admin",
      login: login,
      logout: logout,
    };
  }, [session, user, role, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
