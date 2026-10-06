import { useEffect } from "react";

export function MohallahSurveyPage() {
  useEffect(function () {
    document.title = "Husaini Mohallah - Unified Survey";
    return function () { document.title = "Husaini Mohallah Database"; };
  }, []);

  return (
    <div style={{ height: "calc(100vh - 24px)", minHeight: 700, margin: -8, overflow: "hidden", borderRadius: 10 }}>
      <iframe
        title="Husaini Mohallah Unified Survey"
        src="/husaini-mohallah-unified-survey.html"
        style={{ width: "100%", height: "100%", border: 0, background: "#f6f5f1" }}
      />
    </div>
  );
}
