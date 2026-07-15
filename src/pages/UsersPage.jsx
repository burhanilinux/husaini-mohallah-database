import { useAppContext } from "../context/AppContext.jsx";

export function UsersPage() {
  var ctx = useAppContext();
  var userRole = ctx.userRole, session = ctx.session;
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete, isAdmin = ctx.isAdmin;

  return (
    <div className="w-full flex-1 p-6 md:p-9 lg:ml-[260px]">
      {/* Page Header Layout Block */}
      <div className="mb-8">
        <div className="font-sans text-2xl font-bold text-brand-gold sm:text-[28px]">Users &amp; Roles</div>
        <div className="mt-1 text-xs text-brand-muted sm:text-[13px]">Manage workspace permission tiers and access levels for each system user</div>
      </div>

      {/* Grid Matrix Profile Access Explanation Array */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { role: "admin",  label: "Admin Workspace Head",  icon: "👑", desc: "Full root access — can create, edit, view and delete everything inside the database architecture", color: "text-brand-gold", border: "border-brand-gold/30 bg-brand-gold/5" },
          { role: "editor", label: "Editor Account Scope", icon: "✍️", desc: "Can write and edit active record strings but holds no deletion authorizations over items", color: "text-brand-info", border: "border-brand-info/20 bg-brand-info/5" },
          { role: "viewer", label: "Viewer Reader Only", icon: "👁️", desc: "Read-only workspace authorization — cannot modify, import or clear any file strings", color: "text-brand-muted", border: "border-brand-muted/20 bg-brand-muted/5" },
        ].map(function (r) {
          var isCurrent = userRole === r.role;
          return (
            <div key={r.role} className={"bg-white/[0.02] border rounded-xl p-4 flex flex-col justify-between transition-colors " + (isCurrent ? r.border : "border-brand-gold/10")}>
              <div>
                <div className="text-3xl mb-2">{r.icon}</div>
                <div className={"text-sm font-semibold mb-1 " + r.color}>{r.label}</div>
                <div className="text-[11px] text-brand-muted leading-relaxed">{r.desc}</div>
              </div>
              {isCurrent && (
                <div className={"mt-4 text-[10px] font-medium uppercase tracking-wider " + r.color}>
                  ✓ Active Access Token Applied
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Session Account Information Drawer Card */}
      <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-brand-gold/10 bg-brand-panel/10 text-sm font-semibold text-brand-text">
          Your Access Profile Token Summary
        </div>
        <div className="p-5 md:p-6 flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <div className="text-4xl shrink-0">
            {userRole === "admin" ? "👑" : userRole === "editor" ? "✍️" : "👁️"}
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-brand-gold uppercase tracking-wider">{userRole} Scope</div>
            <div className="text-xs text-brand-muted mt-0.5 truncate max-w-xs md:max-w-md">{session && session.user && session.user.email}</div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium sm:ml-auto flex-wrap">
            <span className={canEdit ? "text-brand-success" : "text-brand-danger"}>
              {canEdit ? "●" : "○"} {canEdit ? "Write Access Authorized" : "Write Forbidden"}
            </span>
            <span className={canDelete ? "text-brand-success" : "text-brand-danger"}>
              {canDelete ? "●" : "○"} {canDelete ? "Deletion Rights Granted" : "Deletion Tier Locked"}
            </span>
            <span className="text-brand-success">
              ● Read View Sync Live
            </span>
          </div>
        </div>
      </div>

      {/* User Role Database Assignments Manager (Admin Only) */}
      {isAdmin && (
        <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-gold/10 bg-brand-panel/10 flex justify-between items-center flex-wrap gap-2">
            <span className="text-sm font-semibold text-brand-text">Assign Security Access Level Roles</span>
            <span className="text-[11px] text-brand-muted">Target paths via Supabase Dashboard &rarr; Authentication &rarr; Users</span>
          </div>
          
          <div className="p-5 md:p-6 flex flex-col gap-6">
            {/* SQL Terminal Instruction Box Component */}
            <div className="bg-brand-gold/5 border border-brand-gold/12 rounded-xl p-4 md:p-5">
              <div className="text-xs text-brand-gold font-bold mb-1.5 uppercase tracking-wide">Relational Access Token Injection Routine</div>
              <div className="text-xs text-brand-muted leading-relaxed">
                Execute this structured script inside your <strong className="text-brand-text">Supabase SQL Editor console terminal</strong> to assign user authorization flags cleanly:
              </div>
              <div className="bg-brand-bg/90 rounded-lg p-3.5 mt-3 font-mono text-xs text-brand-success leading-relaxed border border-brand-gold/5 whitespace-pre overflow-x-auto">
                {"INSERT INTO user_roles (user_id, role)\n"}
                {"SELECT id, 'editor' FROM auth.users\n"}
                {"WHERE email = 'user@example.com'\n"}
                {"ON CONFLICT (user_id) DO UPDATE SET role = 'editor';"}
              </div>
              <div className="mt-2.5 text-[11px] text-gray-500">
                Replace target string <code className="text-brand-gold-lite font-mono">'editor'</code> with security properties <code className="text-brand-gold-lite font-mono">'admin'</code> or <code className="text-brand-gold-lite font-mono">'viewer'</code> based on team tasks.
              </div>
            </div>

            {/* Matrix Rule Permission Board Table */}
            <div className="bg-white/[0.01] border border-brand-gold/5 rounded-lg overflow-hidden">
              <div className="p-3 bg-brand-panel/20 text-xs font-semibold text-brand-text border-b border-brand-gold/5">
                Workspace Permission Resolution Grid
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[10px] uppercase tracking-wider text-brand-muted">
                      <th className="px-4 py-2.5 font-medium">System Action Method</th>
                      <th className="px-4 py-2.5 text-center font-medium text-brand-gold">Admin</th>
                      <th className="px-4 py-2.5 text-center font-medium text-brand-info">Editor</th>
                      <th className="px-4 py-2.5 text-center font-medium text-brand-muted">Viewer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {[
                      ["View all data indices", "✔", "▼", "✔"],
                      ["Add records to cloud tables", "✔", "▼", "✖"],
                      ["Edit existing structural arrays", "✔", "▼", "✖"],
                      ["Execute records permanent deletion", "✔", "✖", "✖"],
                      ["Import spreadsheet packages", "✔", "▼", "✖"],
                      ["Manage global workspace role nodes", "✔", "✖", "✖"],
                    ].map(function (row) {
                      return (
                        <tr key={row[0]}>
                          <td className="px-4 py-2.5 font-medium text-gray-300">{row[0]}</td>
                          <td className={`px-4 py-2.5 text-center font-bold ${row[1] === "✔" ? "text-brand-success" : "text-brand-danger"}`}>{row[1]}</td>
                          <td className={`px-4 py-2.5 text-center font-bold ${row[2] === "✖" ? "text-brand-danger" : "text-brand-info"}`}>{row[2]}</td>
                          <td className={`px-4 py-2.5 text-center font-bold ${row[3] === "✔" ? "text-brand-success" : "text-brand-danger"}`}>{row[3]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}