import { Component } from "react";

// Catches render errors and failed lazy-chunk loads (common right after a deploy
// when an old service-worker cache points at chunks that no longer exist).
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error: error }; }
  componentDidCatch(error, info) { console.error("UI error:", error, info && info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center", color: "#e2d9c9" }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong loading this page</div>
        <div style={{ fontSize: 13, color: "#9ca3af", maxWidth: 420 }}>This can happen right after an update. Reloading usually fixes it.</div>
        <button className="btn btn-primary" onClick={function () { window.location.reload(); }}>Reload</button>
      </div>
    );
  }
}
