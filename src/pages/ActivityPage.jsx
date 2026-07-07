import { useAppContext } from "../context/AppContext.jsx";

export function ActivityPage() {
  var ctx = useAppContext();
  var activityLog = ctx.activityLog, loadAll = ctx.loadAll;

  return (
    <div>
      <div className="page-hdr" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div><div className="page-title">Activity Log</div><div className="page-sub">Recent actions across the system</div></div>
        <button className="btn btn-ghost btn-sm" onClick={loadAll}>↻ Refresh</button>
      </div>
      <div className="card">
        {activityLog.length === 0 ? (
          <div className="empty" style={{ padding: 50 }}>
            <div className="empty-icon">🕘</div>
            <div>No activity recorded yet.</div>
          </div>
        ) : (
          <div>
            {activityLog.map(function (a) {
              var icons = { create: "➕", update: "✏️", delete: "🗑", restore: "↩️", permanent_delete: "❌", backup: "💾", restore_backup: "📤" };
              var verbs = { create: "created", update: "updated", delete: "deleted", restore: "restored", permanent_delete: "permanently deleted", backup: "backed up", restore_backup: "restored from backup" };
              var icon = icons[a.action] || "•";
              var verb = verbs[a.action] || a.action;
              var typeLabel = a.entity_type === "mumin" ? "Mumin record" : a.entity_type === "file" ? "Umoor file" : "System";
              return (
                <div className="activity-item" key={a.id}>
                  <div className={"activity-icon activity-icon-" + a.action}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="activity-text">
                      <b>{a.user_email}</b> {verb} {typeLabel.toLowerCase()}{a.entity_name ? " — " + a.entity_name : ""}
                    </div>
                    <div className="activity-meta">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
