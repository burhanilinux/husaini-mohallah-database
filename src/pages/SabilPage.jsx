import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";

export function SabilPage() {
  var ctx = useAppContext();
  var loading = ctx.loading, sabilNos = ctx.sabilNos, getSabilMembers = ctx.getSabilMembers;
  var setSabilPreview = ctx.setSabilPreview;

  return (
    <div>
      <div className="page-hdr" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="page-title">Sabil Groups</div>
          <div className="page-sub">Members grouped by shared Sabil No.</div>
        </div>
      </div>
      {loading ? <div className="loading"><Spinner /> Loading…</div> : (
        <div>
          {sabilNos.length === 0 ? (
            <div className="card">
              <div className="empty" style={{ padding: 60 }}>
                <div className="empty-icon">🏠</div>
                <div>No Sabil No. assigned yet. Set a Sabil No. on a Mumin record to group them here.</div>
              </div>
            </div>
          ) : (
            <div className="fam-grid">
              {sabilNos.map(function (sn) {
                var members = getSabilMembers(sn);
                return (
                  <div className="fam-card" key={sn}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div className="fam-name">Sabil No. {sn}</div>
                        <div className="fam-meta">{members.length} member{members.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <div className="fam-members">
                      {members.slice(0, 4).map(function (mem) {
                        return (
                          <div className="fam-member-row" key={mem.id}>
                            <span className="fam-member-name">{mem.name}</span>
                            <span style={{ fontSize: 11, color: "#6b7280" }}>{mem.its_number}</span>
                          </div>
                        );
                      })}
                      {members.length > 4 && <div style={{ fontSize: 11, color: "#4b5563", paddingTop: 4 }}>+{members.length - 4} more…</div>}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: "100%" }}
                      onClick={function () { setSabilPreview(sn); }}
                    >
                      View All Members
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
