import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSession, sbGet, sbGetUser, sbSignIn, sbSignOut } from "../lib/supabase.js";

const AuthContext = createContext(null);

function normalizeRole(role) {
  return role === "admin" || role === "editor" || role === "viewer" ? role : "viewer";
}

// Application permissions come from public.user_roles, protected by Supabase RLS.
// Never trust user_metadata/app_metadata for authorization decisions in the client.
export async function getUserRole(user) {
  if (!user || !user.id) return "viewer";
  try {
    var rows = await sbGet("user_roles", "user_id=eq." + encodeURIComponent(user.id) + "&select=role");
    return normalizeRole(Array.isArray(rows) && rows[0] ? rows[0].role : "viewer");
  } catch (_e) {
    // Fail closed if the application-role lookup cannot be completed.
    return "viewer";
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession());
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("viewer");
  const [authLoading, setAuthLoading] = useState(true);

  async function applyUser(nextUser) {
    setUser(nextUser || null);
    if (!nextUser || !nextUser.id) {
      setUserRole("viewer");
      return;
    }
    var nextRole = await getUserRole(nextUser);
    setUserRole(nextRole);
  }

  useEffect(function () {
    var active = true;
    var stored = getSession();
    if (!stored) { setAuthLoading(false); return function () { active = false; }; }
    sbGetUser(stored.access_token).then(async function (nextUser) {
      if (!active) return;
      if (nextUser && nextUser.id) {
        setSession(stored);
        setUser(nextUser);
        var nextRole = await getUserRole(nextUser);
        if (active) setUserRole(nextRole);
      } else {
        setSession(null);
        setUser(null);
        setUserRole("viewer");
      }
    }).catch(function () {
      if (active) { setSession(null); setUser(null); setUserRole("viewer"); }
    }).finally(function () {
      if (active) setAuthLoading(false);
    });
    return function () { active = false; };
  }, []);

  useEffect(function () {
    function onExpired() {
      setSession(null); setUser(null); setUserRole("viewer");
    }
    window.addEventListener("hm-auth-expired", onExpired);
    return function () { window.removeEventListener("hm-auth-expired", onExpired); };
  }, []);

  async function login(email, password) {
    var nextSession = await sbSignIn(email, password);
    localStorage.setItem("hm_session", JSON.stringify(nextSession));
    var nextUser = nextSession.user || await sbGetUser(nextSession.access_token);
    setSession(nextSession);
    await applyUser(nextUser || null);
    return nextSession;
  }

  async function logout() {
    await sbSignOut(session && session.access_token);
    setSession(null); setUser(null); setUserRole("viewer");
  }

  var role = normalizeRole(userRole);
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
