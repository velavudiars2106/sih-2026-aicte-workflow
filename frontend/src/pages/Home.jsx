import { useEffect, useState } from "react";
import { checkBackend, getDashboard, submitData } from "../services/api";

const navigation = [
  { id: "Dashboard", icon: "▦" },
  { id: "Approval Workflow", icon: "⇄" },
  { id: "Compliance Monitoring", icon: "✓" },
  { id: "Alert Management", icon: "⚑" },
];

export default function Home() {
  const [page, setPage] = useState("Dashboard");
  const [status, setStatus] = useState("Checking connection...");
  const [dashboard, setDashboard] = useState(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const health = await checkBackend();
        setStatus(health.message || "Connected");

        const data = await getDashboard();
        setDashboard(data);
      } catch (error) {
        setStatus("Backend disconnected");
      }
    }

    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!input.trim()) {
      setResult("Please enter details before submitting.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await submitData({ input });
      setResult(response.message || "Submission successful.");
      setInput("");
    } catch (error) {
      setResult("Submission failed. Check the backend and API configuration.");
    } finally {
      setLoading(false);
    }
  }

  const connected = !status.toLowerCase().includes("disconnected");

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logo}>AI</div>
          <div>
            <strong>AICTE Workflow</strong>
            <small>SIH 2026 · PS26262</small>
          </div>
        </div>

        <p style={styles.navLabel}>MAIN MENU</p>

        <nav>
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              style={{
                ...styles.navButton,
                ...(page === item.id ? styles.navActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.id}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div
            style={{
              ...styles.statusDot,
              background: connected ? "#22c55e" : "#ef4444",
            }}
          />
          <span>{connected ? "System connection" : "Connection issue"}</span>
          <small>{status}</small>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div>
            <p style={styles.breadcrumb}>AICTE / {page}</p>
            <h1 style={styles.title}>{page}</h1>
          </div>

          <div style={styles.topbarRight}>
            <span style={styles.statusBadge}>
              <span
                style={{
                  ...styles.statusDot,
                  background: connected ? "#16a34a" : "#dc2626",
                }}
              />
              {connected ? "Backend connected" : "Backend offline"}
            </span>
          </div>
        </header>

        {page === "Dashboard" && (
          <>
            <section style={styles.welcome}>
              <div>
                <p style={styles.eyebrow}>SMART INDIA HACKATHON 2026</p>
                <h2>Workflow Approval Management</h2>
                <p>
                  Monitor approval requests, compliance status, and system
                  activity from one place.
                </p>
              </div>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => setPage("Approval Workflow")}
              >
                + New Request
              </button>
            </section>

            <section style={styles.statsGrid}>
              <StatCard
                label="Project"
                value={dashboard?.project || "PS26262"}
                detail="Project identifier"
              />
              <StatCard
                label="System Status"
                value={dashboard?.status || (connected ? "Online" : "Offline")}
                detail="Backend-reported status"
              />
              <StatCard
                label="Approval Requests"
                value="—"
                detail="Connect workflow API to display"
              />
              <StatCard
                label="Pending Alerts"
                value="—"
                detail="Connect alerts API to display"
              />
            </section>

            <section style={styles.panel}>
              <h3>System Overview</h3>
              <p style={styles.muted}>
                {dashboard?.message ||
                  "The dashboard is ready. Connect your workflow APIs to display live approval and compliance data."}
              </p>
              <div style={styles.actionGrid}>
                <ActionCard
                  icon="⇄"
                  title="Approval Workflow"
                  description="Create and submit an approval request."
                  onClick={() => setPage("Approval Workflow")}
                />
                <ActionCard
                  icon="✓"
                  title="Compliance Monitoring"
                  description="Review the compliance monitoring section."
                  onClick={() => setPage("Compliance Monitoring")}
                />
                <ActionCard
                  icon="⚑"
                  title="Alert Management"
                  description="Review the alert management section."
                  onClick={() => setPage("Alert Management")}
                />
              </div>
            </section>
          </>
        )}

        {page === "Approval Workflow" && (
          <section style={styles.panel}>
            <h3>Submit an Approval Request</h3>
            <p style={styles.muted}>
              Enter the request details below. Submission uses your existing
              submitData API function.
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <label htmlFor="requestDetails" style={styles.label}>
                Request details
              </label>
              <textarea
                id="requestDetails"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe the institution, approval request, or workflow details..."
                rows={6}
                style={styles.textarea}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.primaryButton,
                  opacity: loading ? 0.65 : 1,
                }}
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>

              {result && (
                <p role="status" style={styles.result}>
                  {result}
                </p>
              )}
            </form>

            <div style={styles.notice}>
              Note: This form sends data through your existing API. It does not
              yet implement approval stages, reviewer assignment, or document
              verification.
            </div>
          </section>
        )}

        {page === "Compliance Monitoring" && (
          <section style={styles.panel}>
            <h3>Compliance Monitoring</h3>
            <p style={styles.muted}>
              Compliance indicators will be displayed here when the relevant
              backend endpoint and data model are implemented.
            </p>
            <div style={styles.notice}>
              No live compliance records are currently loaded by this page.
              Connect the compliance API before using this section for
              regulatory decisions.
            </div>
          </section>
        )}

        {page === "Alert Management" && (
          <section style={styles.panel}>
            <h3>Alert Management</h3>
            <p style={styles.muted}>
              This section is ready for workflow notifications, pending
              approvals, and deadline alerts.
            </p>
            <div style={styles.notice}>
              No live alerts are currently loaded. An alerts API is required
              before alerts can be displayed or managed.
            </div>
          </section>
        )}

        <footer style={styles.footer}>
          AICTE Workflow Automation · SIH 2026 · PS26262
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <article style={styles.statCard}>
      <p style={styles.muted}>{label}</p>
      <h2 style={styles.statValue}>{value}</h2>
      <small style={styles.statDetail}>{detail}</small>
    </article>
  );
}

function ActionCard({ icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={styles.actionCard}
    >
      <span style={styles.actionIcon}>{icon}</span>
      <strong>{title}</strong>
      <span style={styles.muted}>{description}</span>
      <span style={styles.actionLink}>Open section →</span>
    </button>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#f3f6fb",
    color: "#17243b",
    fontFamily: "Inter, Segoe UI, Arial, sans-serif",
  },
  sidebar: {
    width: "245px",
    flexShrink: 0,
    background: "#102344",
    color: "#fff",
    padding: "25px 16px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 8px 30px",
  },
  logo: {
    width: "42px",
    height: "42px",
    display: "grid",
    placeItems: "center",
    borderRadius: "12px",
    background: "#2563eb",
    fontWeight: 800,
  },
  navLabel: {
    color: "#91a4c3",
    fontSize: "11px",
    letterSpacing: "1.5px",
    paddingLeft: "12px",
    marginBottom: "12px",
  },
  navButton: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "13px 12px",
    marginBottom: "7px",
    border: "1px solid transparent",
    borderRadius: "8px",
    background: "transparent",
    color: "#d5dfef",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "13px",
  },
  navActive: {
    background: "#244474",
    color: "#fff",
    borderColor: "#3c6097",
  },
  navIcon: {
    width: "20px",
    textAlign: "center",
    fontSize: "18px",
  },
  sidebarBottom: {
    marginTop: "auto",
    padding: "18px 10px 0",
    borderTop: "1px solid #2a3d5c",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    fontSize: "12px",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: "28px 32px",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },
  breadcrumb: {
    color: "#75849b",
    fontSize: "12px",
    margin: "0 0 7px",
  },
  title: {
    fontSize: "26px",
    margin: 0,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fff",
    border: "1px solid #e0e7f0",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "12px",
  },
  welcome: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    background: "linear-gradient(115deg, #17365d, #285b9c)",
    color: "#fff",
    padding: "28px",
    borderRadius: "14px",
    marginBottom: "22px",
  },
  eyebrow: {
    fontSize: "10px",
    letterSpacing: "1.8px",
    color: "#bfd6ff",
  },
  primaryButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 17px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e1e8f1",
    borderRadius: "12px",
    padding: "20px",
    minWidth: 0,
  },
  statValue: {
    fontSize: "23px",
    margin: "12px 0",
    overflowWrap: "anywhere",
  },
  statDetail: {
    color: "#7b899e",
    fontSize: "11px",
  },
  panel: {
    background: "#fff",
    border: "1px solid #e1e8f1",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "22px",
  },
  muted: {
    color: "#718096",
    fontSize: "13px",
    lineHeight: 1.7,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginTop: "22px",
  },
  actionCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "10px",
    padding: "18px",
    border: "1px solid #e0e7f0",
    borderRadius: "10px",
    background: "#fff",
    color: "#17243b",
    textAlign: "left",
    cursor: "pointer",
  },
  actionIcon: {
    display: "grid",
    placeItems: "center",
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    background: "#eaf1ff",
    color: "#2455a4",
    fontSize: "20px",
  },
  actionLink: {
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 600,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "22px",
  },
  label: {
    fontWeight: 600,
    fontSize: "13px",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    font: "inherit",
    fontSize: "13px",
    resize: "vertical",
  },
  result: {
    padding: "12px",
    background: "#eff6ff",
    borderRadius: "8px",
    fontSize: "13px",
  },
  notice: {
    marginTop: "20px",
    padding: "14px",
    background: "#fff8e6",
    color: "#805d15",
    border: "1px solid #f4dfac",
    borderRadius: "8px",
    fontSize: "12px",
    lineHeight: 1.7,
  },
  footer: {
    padding: "15px 0",
    color: "#8290a4",
    fontSize: "11px",
    textAlign: "center",
  },
};