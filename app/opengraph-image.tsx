import { ImageResponse } from "next/og";

export const alt = "Workforce Intelligence by Ed Om. Explore evidence, compare assumptions, and save a plan. Portfolio demo with synthetic workforce data.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Self-contained share artwork: no workforce records, model calls or remote assets.
export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "52px 64px", background: "#f3f6fb", color: "#152e4a", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#435f79" }}>
        <span>PORTFOLIO DEMO</span><span>ed-ai.app</span>
      </div>
      <div style={{ display: "flex", marginTop: 40, fontSize: 66, fontWeight: 700, letterSpacing: -2 }}>Workforce Intelligence</div>
      <div style={{ display: "flex", marginTop: 12, fontSize: 32 }}>From workforce evidence to a plan.</div>
      <div style={{ display: "flex", gap: 18, marginTop: 44 }}>
        {["Explore evidence", "Compare assumptions", "Save a plan"].map((label, index) => (
          <div key={label} style={{ display: "flex", flex: 1, flexDirection: "column", gap: 18, padding: "24px", border: "1px solid #ccd8e6", borderRadius: 16, background: "#ffffff", fontSize: 25 }}>
            <span style={{ color: "#267276", fontSize: 22 }}>0{index + 1}</span><span>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", fontSize: 22, color: "#435f79" }}>
        <span>By Ed Om</span><span>Synthetic workforce data | Conditional scenarios</span>
      </div>
    </div>,
    size,
  );
}
