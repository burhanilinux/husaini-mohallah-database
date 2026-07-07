import { useAppContext } from "../context/AppContext.jsx";

export function UsersPage() {
  var ctx = useAppContext();
  var userRole = ctx.userRole, session = ctx.session;
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete, isAdmin = ctx.isAdmin;

  return (
    <div>
      <div className="page-hdr" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div><div className="page-title">Users & Roles</div><div className="page-sub">Manage access levels for each user</div></div>
      </div>

      {/* Role explanation cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { role: "admin",  label: "Admin",  icon: "👑", desc: "Full access — create, edit, delete everything", color: "#c9a84c" },
          { role: "editor", label: "Editor", icon: "✏️", desc: "Can add and edit records but cannot delete", color: "#60a5fa" },
          { role: "viewer", label: "Viewer", icon: "👁", desc: "Read-only access — cannot modify any data", color: "#9ca3af" },
        ].map(function (r) {
          return (
            <div key={r.role} className={"umoor-card" + (userRole === r.role ? " selected" : "")} style={{ cursor: "default" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: r.color, marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>{r.desc}</div>
              {userRole === r.role && <div style={{ marginTop: 8, fontSize: 10, color: r.color }}>● Your current role</div>}
            </div>
          );
        })}
      </div>

      {/* My role */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(184,152,90,.1)", fontSize: 14, fontWeight: 600, color: "#e2d9c9" }}>Your Access</div>
        <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 36 }}>{userRole === "admin" ? "👑" : userRole === "editor" ? "✏️" : "👁"}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: userRole === "admin" ? "#c9a84c" : userRole === "editor" ? "#60a5fa" : "#9ca3af", textTransform: "capitalize" }}>{userRole}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{session && session.user && session.user.email}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: canEdit ? "#34d399" : "#f87171" }}>{canEdit ? "✓" : "✗"} Can Edit</span>
            <span style={{ fontSize: 12, color: canDelete ? "#34d399" : "#f87171", marginLeft: 12 }}>{canDelete ? "✓" : "✗"} Can Delete</span>
            <span style={{ fontSize: 12, color: "#34d399", marginLeft: 12 }}>✓ Can View</span>
          </div>
        </div>
      </div>

      {/* User role assignments — admin only */}
      {isAdmin && (
        <div className="card">
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(184,152,90,.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#e2d9c9" }}>Assign Roles to Users</span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Users must first be created in Supabase → Authentication → Users</span>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ background: "rgba(201,168,76,.05)", border: "1px solid rgba(201,168,76,.12)", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#c9a84c", fontWeight: 600, marginBottom: 8 }}>How to assign a role</div>
              <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.8 }}>
                Run this in your <strong style={{ color: "#e2d9c9" }}>Supabase SQL Editor</strong>, replacing the email and role:
              </div>
              <div style={{ background: "#0d1117", borderRadius: 8, padding: "12px 16px", marginTop: 10, fontFamily: "monospace", fontSize: 12, color: "#34d399", lineHeight: 1.8 }}>
                {"INSERT INTO user_roles (user_id, role)"}<br />
                {"SELECT id, 'editor' FROM auth.users"}<br />
                {"WHERE email = 'user@example.com'"}<br />
                {"ON CONFLICT (user_id) DO UPDATE SET role = 'editor';"}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#6b7280" }}>
                Replace <code style={{ color: "#c9a84c" }}>'editor'</code> with <code style={{ color: "#c9a84c" }}>'admin'</code>, <code style={{ color: "#c9a84c" }}>'editor'</code>, or <code style={{ color: "#c9a84c" }}>'viewer'</code>
              </div>
            </div>
            <div style={{ background: "rgba(96,165,250,.04)", border: "1px solid rgba(96,165,250,.12)", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, marginBottom: 8 }}>Permission Summary</div>
              <table style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", color: "#6b7280", padding: "4px 0", fontWeight: 500 }}>Action</th>
                    <th style={{ textAlign: "center", color: "#c9a84c", padding: "4px 8px" }}>Admin</th>
                    <th style={{ textAlign: "center", color: "#60a5fa", padding: "4px 8px" }}>Editor</th>
                    <th style={{ textAlign: "center", color: "#9ca3af", padding: "4px 8px" }}>Viewer</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["View all data", "✓", "✓", "✓"],
                    ["Add records", "✓", "✓", "✗"],
                    ["Edit records", "✓", "✓", "✗"],
                    ["Delete records", "✓", "✗", "✗"],
                    ["Import data", "✓", "✓", "✗"],
                    ["Manage users", "✓", "✗", "✗"],
                  ].map(function (row) {
                    return (
                      <tr key={row[0]} style={{ borderTop: "1px solid rgba(255,255,255,.03)" }}>
                        <td style={{ padding: "7px 0", color: "#d1c9bb" }}>{row[0]}</td>
                        <td style={{ textAlign: "center", color: row[1] === "✓" ? "#34d399" : "#f87171" }}>{row[1]}</td>
                        <td style={{ textAlign: "center", color: row[2] === "✓" ? "#34d399" : "#f87171" }}>{row[2]}</td>
                        <td style={{ textAlign: "center", color: row[3] === "✓" ? "#34d399" : "#f87171" }}>{row[3]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
