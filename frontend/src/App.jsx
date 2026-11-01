import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Workflow,
  X,
} from "lucide-react";

import "./App.css";
import Auth from "./auth";

// ======================================================
// CONFIGURATION
// ======================================================

const API_BASE = "http://127.0.0.1:8000";

async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem("access_token");
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

// ======================================================
// INITIAL DATA
// ======================================================

const initialAlerts = [
  {
    id: 1,
    title: "Application awaiting review",
    detail: "An application is waiting for reviewer verification.",
    read: false,
  },
  {
    id: 2,
    title: "Compliance records required",
    detail: "Institutional compliance records need to be reviewed.",
    read: false,
  },
  {
    id: 3,
    title: "Backend connectivity",
    detail: "FastAPI health endpoint is available.",
    read: true,
  },
];

const initialChecks = [
  {
    id: 1,
    title: "Institution profile received",
    detail: "Institution identity and contact information",
    done: false,
  },
  {
    id: 2,
    title: "Required documents uploaded",
    detail: "Required supporting documents are available",
    done: false,
  },
  {
    id: 3,
    title: "Eligibility criteria checked",
    detail: "Review applicable approval criteria",
    done: false,
  },
  {
    id: 4,
    title: "Reviewer assigned",
    detail: "An authorized reviewer has been assigned",
    done: false,
  },
  {
    id: 5,
    title: "Decision recorded",
    detail: "Record the final decision and reason",
    done: false,
  },
];

const pages = [
  {
    id: "Dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "Approval Workflow",
    label: "Approval Workflow",
    icon: Workflow,
  },
  {
    id: "Compliance Monitoring",
    label: "Compliance Monitoring",
    icon: ClipboardCheck,
  },
  {
    id: "Alert Management",
    label: "Alert Management",
    icon: Bell,
  },
];

// ======================================================
// REUSABLE COMPONENTS
// ======================================================

function StatusPill({ children }) {
  const className = String(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return (
    <span className={`status-pill status-${className}`}>
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="heading-description">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}

function ApplicationTable({ applications }) {
  if (!applications.length) {
    return (
      <div className="empty-state">
        No applications found. Submit a new application to get started.
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Application ID</th>
            <th>Institution</th>
            <th>Type</th>
            <th>Status</th>
            <th>Compliance</th>
            <th>Source</th>
          </tr>
        </thead>

        <tbody>
          {applications.map((application) => (
            <tr key={application.id}>
              <td className="id-cell">
                {application.id}
              </td>

              <td>
                <strong>{application.institution}</strong>
              </td>

              <td>{application.type}</td>

              <td>
                <StatusPill>
                  {application.status}
                </StatusPill>
              </td>

              <td>
                <StatusPill>
                  {application.compliance}
                </StatusPill>
              </td>

              <td>
                <span className="source-label source-backend">
                  Backend
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ======================================================
// MAIN APPLICATION
// ======================================================

export default function App() {

  // ----------------------------------------------------
  // APPLICATION STATE
  // ----------------------------------------------------

  const [activePage, setActivePage] = useState("Dashboard");
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const isOfficial = session?.role === "official";
  const isInstitution = session?.role === "institution";

  const [backendStatus, setBackendStatus] = useState("Checking");

  const [backendMessage, setBackendMessage] = useState(
    "Checking FastAPI health endpoint..."
  );

  const [applications, setApplications] = useState([]);

  const [alerts, setAlerts] = useState(initialAlerts);

  const [checks, setChecks] = useState(initialChecks);

  const [statistics, setStatistics] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("All statuses");

  const [showForm, setShowForm] = useState(false);

  const [notice, setNotice] = useState("");

  const [noticeType, setNoticeType] = useState("success");

  const [submitting, setSubmitting] = useState(false);

  const [loadingApplications, setLoadingApplications] = useState(false);

  const [form, setForm] = useState({
    application_type: "New approval",
    title: "",
    description: "",
  });

  // ----------------------------------------------------
  // NOTIFICATION
  // ----------------------------------------------------

  function showNotice(message, type = "success") {
    setNotice(message);
    setNoticeType(type);
  }

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 6000);

    return () => clearTimeout(timer);
  }, [notice]);

  // ----------------------------------------------------
  // BACKEND HEALTH CHECK
  // ----------------------------------------------------

  async function checkBackend() {
    setBackendStatus("Checking");

    setBackendMessage(
      "Checking FastAPI health endpoint..."
    );

    try {
      const response = await fetch(`${API_BASE}/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      setBackendStatus("Connected");

      setBackendMessage(
        `FastAPI: ${result.backend} | Database: ${result.database}`
      );

      return true;

    } catch (error) {
      console.error("Backend connection error:", error);

      setBackendStatus("Disconnected");

      setBackendMessage(
        "FastAPI or database is unavailable."
      );

      return false;
    }
  }

  // ----------------------------------------------------
  // NORMALIZE BACKEND APPLICATION
  // ----------------------------------------------------

  function normalizeApplication(item) {
    return {
      id: String(item.id),
      institution: item.institution_name,
      email: item.institution_email,
      type: item.application_type,
      title: item.title,
      description: item.description,
      status: item.status,
      compliance: item.compliance_status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      source: "Backend",
    };
  }

  // ----------------------------------------------------
  // LOAD APPLICATIONS FROM DATABASE
  // ----------------------------------------------------

  async function loadApplications() {
    setLoadingApplications(true);

    try {
      const response = await apiFetch("/api/applications");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      const backendRecords = result.map(
        normalizeApplication
      );

      // Only real database records are displayed.
      setApplications(backendRecords);

    } catch (error) {
      console.error("Application loading error:", error);

      showNotice(
        `Could not load applications: ${error.message}`,
        "error"
      );

    } finally {
      setLoadingApplications(false);
    }
  }

  // ----------------------------------------------------
  // LOAD DASHBOARD STATISTICS
  // ----------------------------------------------------

  async function loadStatistics() {
    try {
      const response = await apiFetch("/api/dashboard/statistics");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      setStatistics(result);

    } catch (error) {
      console.error(
        "Statistics loading error:",
        error
      );
    }
  }

  // ----------------------------------------------------
  // INITIALIZE APPLICATION
  // ----------------------------------------------------

  // Restore an existing login session after a page refresh.
  useEffect(() => {
    async function restoreSession() {
      const token = sessionStorage.getItem("access_token");

      if (!token) {
        setAuthChecking(false);
        return;
      }

      try {
        const response = await apiFetch("/api/auth/me");

        if (!response.ok) {
          throw new Error("Your session has expired. Please log in again.");
        }

        const user = await response.json();
        setSession(user);
      } catch (error) {
        console.error("Session restoration failed:", error);
        sessionStorage.removeItem("access_token");
        setSession(null);
      } finally {
        setAuthChecking(false);
      }
    }

    checkBackend();
    restoreSession();
  }, []);

  // Load protected data only after a user has authenticated.
  useEffect(() => {
    if (!session) {
      setApplications([]);
      setStatistics(null);
      return;
    }

    loadApplications();
    loadStatistics();
  }, [session?.id]);

  // ----------------------------------------------------
  // AUTHENTICATION HANDLERS
  // ----------------------------------------------------

  function handleLogin(result) {
    setSession(result.user);
    setActivePage("Dashboard");
    setShowForm(false);
    showNotice(`Signed in as ${result.user.full_name}.`);
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    setSession(null);
    setApplications([]);
    setStatistics(null);
    setShowForm(false);
    setActivePage("Dashboard");
    showNotice("You have been signed out.");
  }

  // ----------------------------------------------------
  // FILTER APPLICATIONS
  // ----------------------------------------------------

  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesSearch =
        !query ||
        [
          application.id,
          application.institution,
          application.email,
          application.type,
          application.title,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

      const matchesStatus =
        statusFilter === "All statuses" ||
        application.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  // ----------------------------------------------------
  // DASHBOARD COUNTS
  // ----------------------------------------------------

  const unreadAlerts = alerts.filter(
    (alert) => !alert.read
  ).length;

  const completedChecks = checks.filter(
    (item) => item.done
  ).length;

  // ----------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------

  async function navigate(page) {
    setActivePage(page);
    setNotice("");

    if (page === "Approval Workflow") {
      await loadApplications();
    }

    if (page === "Dashboard") {
      await Promise.all([
        loadStatistics(),
        loadApplications(),
      ]);
    }

    if (page === "Compliance Monitoring") {
      await Promise.all([
        loadStatistics(),
        loadApplications(),
      ]);
    }
  }

  // ----------------------------------------------------
  // NEW APPLICATION FORM
  // ----------------------------------------------------

  function openNewApplication() {
    setForm({
      application_type: "New approval",
      title: "",
      description: "",
    });

    setShowForm(true);
    setActivePage("Approval Workflow");

    loadApplications();
  }

  // ----------------------------------------------------
  // SUBMIT APPLICATION TO FASTAPI
  // ----------------------------------------------------

  async function submitApplication(event) {
    event.preventDefault();

    const payload = {
      application_type: form.application_type,
      title: form.title.trim(),
      description: form.description.trim(),
    };

    if (
      !payload.application_type ||
      !payload.title ||
      !payload.description
    ) {
      showNotice(
        "Please complete all required fields.",
        "error"
      );

      return;
    }

    if (backendStatus !== "Connected") {
      showNotice(
        "Backend disconnected. Application was not submitted.",
        "error"
      );

      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch(
        "/api/applications",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const result = await response.json().catch(
        () => ({})
      );

      if (!response.ok) {
        const details =
          typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(
                result.detail || result
              );

        throw new Error(
          `HTTP ${response.status}: ${details}`
        );
      }

      setShowForm(false);

      setForm({
        application_type: "New approval",
        title: "",
        description: "",
      });

      showNotice(
        `Application #${result.id} successfully saved to the database.`
      );

      await Promise.all([
        loadApplications(),
        loadStatistics(),
      ]);

    } catch (error) {
      console.error(
        "Application submission failed:",
        error
      );

      showNotice(
        `Submission failed: ${error.message}`,
        "error"
      );

    } finally {
      setSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // UPDATE APPLICATION STATUS
  // ----------------------------------------------------

  async function updateApplicationStatus(id, status) {
    try {
      const response = await apiFetch(
        `/api/applications/${id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status: status,
          }),
        }
      );

      const result = await response.json().catch(
        () => ({})
      );

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(
                result.detail || result
              )
        );
      }

      setApplications((previous) =>
        previous.map((item) =>
          String(item.id) === String(id)
            ? {
                ...item,
                status: result.status,
              }
            : item
        )
      );

      showNotice(
        `Application status updated to ${status}.`
      );

      await loadStatistics();

    } catch (error) {
      showNotice(
        `Status update failed: ${error.message}`,
        "error"
      );

      await loadApplications();
    }
  }

  // ----------------------------------------------------
  // UPDATE COMPLIANCE STATUS
  // ----------------------------------------------------

  async function updateComplianceStatus(id, status) {
    try {
      const response = await apiFetch(
        `/api/applications/${id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            compliance_status: status,
          }),
        }
      );

      const result = await response.json().catch(
        () => ({})
      );

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(
                result.detail || result
              )
        );
      }

      setApplications((previous) =>
        previous.map((item) =>
          String(item.id) === String(id)
            ? {
                ...item,
                compliance: result.compliance_status,
              }
            : item
        )
      );

      showNotice(
        `Compliance status updated to ${status}.`
      );

      await loadStatistics();

    } catch (error) {
      showNotice(
        `Compliance update failed: ${error.message}`,
        "error"
      );

      await loadApplications();
    }
  }

  // ----------------------------------------------------
  // COMPLIANCE CHECKLIST
  // ----------------------------------------------------

  function toggleCheck(id) {
    setChecks((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              done: !item.done,
            }
          : item
      )
    );
  }

  function resetChecklist() {
    setChecks(
      initialChecks.map((item) => ({
        ...item,
        done: false,
      }))
    );
  }

  // ----------------------------------------------------
  // ALERT MANAGEMENT
  // ----------------------------------------------------

  function markAlertRead(id) {
    setAlerts((previous) =>
      previous.map((alert) =>
        alert.id === id
          ? {
              ...alert,
              read: true,
            }
          : alert
      )
    );
  }

  function markAllRead() {
    setAlerts((previous) =>
      previous.map((alert) => ({
        ...alert,
        read: true,
      }))
    );

    showNotice("All alerts marked as read.");
  }

  function dismissAlert(id) {
    setAlerts((previous) =>
      previous.filter(
        (alert) => alert.id !== id
      )
    );

    showNotice("Alert dismissed.");
  }

  // ----------------------------------------------------
  // REFRESH SYSTEM
  // ----------------------------------------------------

  async function refreshSystem() {
    const connected = await checkBackend();

    if (connected) {
      await Promise.all([
        loadApplications(),
        loadStatistics(),
      ]);

      showNotice("System information refreshed.");
    }
  }

  // ======================================================
  // RENDER
  // ======================================================

  if (authChecking) {
    return (
      <div className="auth-loading">
        Checking your session...
      </div>
    );
  }

  if (!session) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-mark">
            <ShieldCheck size={25} />
          </div>

          <div className="brand-text">
            <strong>AICTE WORKFLOW</strong>
            <span>SIH 2026 · PS26262</span>
          </div>

        </div>

        <nav
          className="side-nav"
          aria-label="Main navigation"
        >

          {pages.map(
            ({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`nav-item ${
                  activePage === id ? "active" : ""
                }`}
                onClick={() => navigate(id)}
                aria-current={
                  activePage === id
                    ? "page"
                    : undefined
                }
              >

                <Icon size={18} />

                <span>{label}</span>

                {id === "Alert Management" &&
                  unreadAlerts > 0 && (
                    <span className="nav-count">
                      {unreadAlerts}
                    </span>
                  )}

              </button>
            )
          )}

        </nav>

        <div className="sidebar-bottom">

          <span
            className={`connection-dot ${
              backendStatus === "Connected"
                ? "online"
                : backendStatus === "Disconnected"
                  ? "offline"
                  : "checking"
            }`}
          />

          <div>

            <strong>
              {backendStatus === "Connected"
                ? "Backend connected"
                : backendStatus === "Checking"
                  ? "Checking system"
                  : "Backend disconnected"}
            </strong>

            <span>SIH 2026 prototype</span>

          </div>

        </div>

      </aside>

      {/* MAIN AREA */}

      <main className="main-area">

        {/* TOPBAR */}

        <header className="topbar">

          <div className="breadcrumb">

            <span>SIH 2026</span>

            <ChevronRight size={14} />

            <strong>{activePage}</strong>

          </div>

          <div className="topbar-actions">

            <span
              className={`connection-label ${
                backendStatus === "Connected"
                  ? "connected"
                  : "disconnected"
              }`}
            >

              <span className="connection-dot" />

              {backendStatus}

            </span>

            <span className="connection-label">
              {session?.full_name} · {session?.role}
            </span>

            <button
              className="button secondary"
              type="button"
              onClick={logout}
            >
              Sign out
            </button>

            <button
              className="icon-button"
              type="button"
              title="Refresh backend connection"
              aria-label="Refresh backend connection"
              onClick={refreshSystem}
            >
              <RefreshCw size={17} />
            </button>

          </div>

        </header>

        <div className="page-content">

          {/* NOTIFICATIONS */}

          {notice && (
            <div
              className={`notice ${
                noticeType === "error"
                  ? "notice-error"
                  : ""
              }`}
              role="status"
            >

              {noticeType === "error" ? (
                <AlertTriangle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}

              <span>{notice}</span>

              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>

            </div>
          )}

          {/* =================================================
              DASHBOARD
          ================================================= */}

          {activePage === "Dashboard" && (
            <>

              <SectionHeading
                eyebrow="SYSTEM OVERVIEW"
                title="System status"
                description="Monitor institutional approval workflows, backend connectivity and compliance."
                action={
                  isInstitution ? (
                    <button
                      className="button primary"
                      type="button"
                      onClick={openNewApplication}
                    >
                      <Plus size={17} />
                      New application
                    </button>
                  ) : null
                }
              />

              {/* METRICS */}

              <div className="metrics-grid">

                <div className="metric-card">

                  <div className="metric-icon blue">
                    <Activity size={20} />
                  </div>

                  <div>
                    <span className="metric-label">
                      Backend connection
                    </span>

                    <strong>{backendStatus}</strong>

                    <small>{backendMessage}</small>
                  </div>

                </div>

                <div className="metric-card">

                  <div className="metric-icon green">
                    <Workflow size={20} />
                  </div>

                  <div>
                    <span className="metric-label">
                      Total applications
                    </span>

                    <strong>
                      {statistics?.total_applications ?? 0}
                    </strong>

                    <small>
                      Records from the backend database.
                    </small>
                  </div>

                </div>

                <div className="metric-card">

                  <div className="metric-icon orange">
                    <ClipboardCheck size={20} />
                  </div>

                  <div>
                    <span className="metric-label">
                      Compliance checklist
                    </span>

                    <strong>
                      {completedChecks}/{checks.length}
                    </strong>

                    <small>
                      Frontend demonstration checklist.
                    </small>
                  </div>

                </div>

                <div className="metric-card">

                  <div className="metric-icon purple">
                    <Bell size={20} />
                  </div>

                  <div>
                    <span className="metric-label">
                      Unread alerts
                    </span>

                    <strong>{unreadAlerts}</strong>

                    <small>
                      Prototype notifications.
                    </small>
                  </div>

                </div>

              </div>

              {/* DASHBOARD PANELS */}

              <div className="dashboard-grid">

                <section className="panel">

                  <div className="panel-title">

                    <div className="panel-title-icon">
                      <FileText size={19} />
                    </div>

                    <div>
                      <h2>Project information</h2>
                      <p>
                        AICTE approval workflow dashboard
                      </p>
                    </div>

                  </div>

                  <dl className="info-list">

                    <div>
                      <dt>Problem statement</dt>
                      <dd>PS26262</dd>
                    </div>

                    <div>
                      <dt>Project title</dt>
                      <dd>
                        Integrated AICTE Approval Workflow
                        Automation, Compliance Monitoring
                        and Alert Management System
                      </dd>
                    </div>

                    <div>
                      <dt>Backend</dt>
                      <dd>FastAPI · {backendStatus}</dd>
                    </div>

                    <div>
                      <dt>Frontend</dt>
                      <dd>React + Vite · Running</dd>
                    </div>

                    <div>
                      <dt>Database</dt>
                      <dd>SQLite</dd>
                    </div>

                  </dl>

                  <button
                    className="text-button"
                    type="button"
                    onClick={refreshSystem}
                  >
                    <RefreshCw size={15} />
                    Refresh system
                  </button>

                </section>

                <section className="panel">

                  <div className="panel-title">

                    <div className="panel-title-icon warning">
                      <Gauge size={19} />
                    </div>

                    <div>
                      <h2>Application statistics</h2>
                      <p>
                        Data retrieved from FastAPI
                      </p>
                    </div>

                  </div>

                  {[
                    [
                      "Submitted",
                      statistics?.submitted,
                    ],
                    [
                      "Under review",
                      statistics?.under_review,
                    ],
                    [
                      "Approved",
                      statistics?.approved,
                    ],
                    [
                      "Rejected",
                      statistics?.rejected,
                    ],
                    [
                      "Pending compliance",
                      statistics?.pending_compliance,
                    ],
                  ].map(([label, value]) => (

                    <div
                      className="readiness-row"
                      key={label}
                    >

                      <CheckCircle2
                        className="ready-icon"
                        size={19}
                      />

                      <div>
                        <strong>{label}</strong>
                        <span>
                          Backend application records
                        </span>
                      </div>

                      <strong>{value ?? 0}</strong>

                    </div>

                  ))}

                </section>

              </div>

              {/* RECENT APPLICATIONS */}

              <section className="panel">

                <div className="panel-header">

                  <div>
                    <h2>Recent applications</h2>
                    <p>
                      Latest applications from the database.
                    </p>
                  </div>

                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      navigate("Approval Workflow")
                    }
                  >
                    View all
                    <ChevronRight size={15} />
                  </button>

                </div>

                <ApplicationTable
                  applications={applications.slice(0, 5)}
                />

              </section>

            </>
          )}

          {/* =================================================
              APPROVAL WORKFLOW
          ================================================= */}

          {activePage === "Approval Workflow" && (
            <>

              <SectionHeading
                eyebrow="APPLICATIONS"
                title="Approval Workflow"
                description="Create, retrieve and track institutional approval applications."
                action={
                  isInstitution ? (
                    <button
                      className="button primary"
                      type="button"
                      onClick={() => setShowForm((value) => !value)}
                    >
                      <Plus size={17} />
                      {showForm ? "Close form" : "New application"}
                    </button>
                  ) : null
                }
              />

              {/* APPLICATION FORM */}

              {isInstitution && showForm && (

                <section className="panel form-panel">

                  <div className="panel-header">

                    <div>
                      <h2>Submit an application</h2>
                      <p>
                        Enter institution information and
                        application details.
                      </p>
                    </div>

                    <button
                      className="icon-button"
                      type="button"
                      aria-label="Close form"
                      onClick={() => setShowForm(false)}
                    >
                      <X size={18} />
                    </button>

                  </div>

                  <form onSubmit={submitApplication}>

                    <div className="form-grid">

                      <label>
                        Application type *

                        <select
                          value={form.application_type}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              application_type:
                                event.target.value,
                            })
                          }
                        >
                          <option>New approval</option>
                          <option>Renewal</option>
                          <option>Change request</option>
                          <option>Compliance response</option>
                        </select>
                      </label>

                      <label className="full-width">
                        Application title *

                        <input
                          value={form.title}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              title: event.target.value,
                            })
                          }
                          placeholder="Enter application title"
                          minLength={3}
                          maxLength={250}
                          required
                        />
                      </label>

                      <label className="full-width">
                        Application description *

                        <textarea
                          value={form.description}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              description: event.target.value,
                            })
                          }
                          placeholder="Describe the application and supporting details"
                          rows={4}
                          minLength={5}
                          required
                        />
                      </label>

                    </div>

                    <div className="form-footer">

                      <span className="form-help">
                        {backendStatus === "Connected"
                          ? "Connected to FastAPI. Submissions are saved to SQLite."
                          : "Backend unavailable. Start FastAPI before submitting."}
                      </span>

                      <button
                        className="button primary"
                        type="submit"
                        disabled={
                          submitting ||
                          backendStatus !== "Connected"
                        }
                      >

                        <Send size={16} />

                        {submitting
                          ? "Submitting..."
                          : "Submit application"}

                      </button>

                    </div>

                  </form>

                </section>

              )}

              {/* APPLICATION TRACKER */}

              <section className="panel">

                <div className="panel-header">

                  <div>
                    <h2>Application tracker</h2>

                    <p>
                      {applications.length} applications
                      currently stored in the database
                    </p>
                  </div>

                  <button
                    className="text-button"
                    type="button"
                    onClick={loadApplications}
                    disabled={loadingApplications}
                  >

                    <RefreshCw size={15} />

                    {loadingApplications
                      ? "Loading..."
                      : "Refresh"}

                  </button>

                </div>

                {/* SEARCH AND FILTER */}

                <div className="table-tools">

                  <label className="search-box">

                    <Search size={17} />

                    <input
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search institution, ID or type..."
                    />

                  </label>

                  <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                  >

                    <option>All statuses</option>

                    {[
                      ...new Set(
                        applications.map(
                          (application) => application.status
                        )
                      ),
                    ].map((status) => (
                      <option key={status}>
                        {status}
                      </option>
                    ))}

                  </select>

                </div>

                <ApplicationTable
                  applications={filteredApplications}
                />

                {/* STATUS MANAGEMENT */}

                {isOfficial && (
                <div className="workflow-actions">

                  <h3>Application status management</h3>

                  <p className="form-help">
                    Update the status of a saved application.
                  </p>

                  {applications.map((app) => (

                    <div
                      className="readiness-row"
                      key={app.id}
                    >

                      <div>
                        <strong>
                          #{app.id} · {app.institution}
                        </strong>

                        <span>{app.status}</span>
                      </div>

                      <select
                        aria-label={`Update status for application ${app.id}`}
                        value={app.status}
                        onChange={(event) =>
                          updateApplicationStatus(
                            app.id,
                            event.target.value
                          )
                        }
                      >

                        <option>Submitted</option>
                        <option>Under Review</option>
                        <option>Approved</option>
                        <option>Rejected</option>
                        <option>Returned for Correction</option>

                      </select>

                    </div>

                  ))}

                </div>
                )}

              </section>

            </>
          )}

          {/* =================================================
              COMPLIANCE MONITORING
          ================================================= */}

          {activePage === "Compliance Monitoring" && (
            <>

              <SectionHeading
                eyebrow="COMPLIANCE"
                title="Compliance Monitoring"
                description="Track institutional compliance review activities."
                action={
                  isOfficial ? (
                    <button
                      className="button secondary"
                      type="button"
                      onClick={resetChecklist}
                    >
                      <RefreshCw size={16} />
                      Reset checklist
                    </button>
                  ) : null
                }
              />

              {/* COMPLIANCE PROGRESS */}

              <section className="panel compliance-summary">

                <div className="progress-copy">

                  <div>
                    <span className="metric-label">
                      Checklist progress
                    </span>

                    <strong>
                      {completedChecks} of {checks.length} complete
                    </strong>
                  </div>

                  <span className="progress-percent">
                    {Math.round(
                      (completedChecks / checks.length) * 100
                    )}%
                  </span>

                </div>

                <div className="progress-track">

                  <span
                    style={{
                      width: `${
                        (completedChecks / checks.length) * 100
                      }%`,
                    }}
                  />

                </div>

                <p className="form-help">
                  This checklist is a frontend demonstration.
                  It is not an official AICTE compliance determination.
                </p>

              </section>

              {/* CHECKLIST */}

              <section className="panel">

                <div className="panel-header">

                  <div>
                    <h2>Institutional review checklist</h2>
                    <p>
                      Check an item to mark it complete.
                    </p>
                  </div>

                  <StatusPill>
                    {completedChecks === checks.length
                      ? "Complete"
                      : "In progress"}
                  </StatusPill>

                </div>

                <div className="checklist">

                  {checks.map((item) => (

                    <label
                      key={item.id}
                      className={`check-item ${
                        item.done ? "checked" : ""
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={!isOfficial}
                        onChange={() => toggleCheck(item.id)}
                      />

                      <span className="custom-checkbox">
                        {item.done && (
                          <Check size={14} />
                        )}
                      </span>

                      <span className="check-copy">
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>

                      <span className="check-state">
                        {item.done
                          ? "Complete"
                          : "Pending"}
                      </span>

                    </label>

                  ))}

                </div>

              </section>

              {/* BACKEND COMPLIANCE */}

              <section className="panel">

                <div className="panel-header">

                  <div>
                    <h2>Backend compliance overview</h2>
                    <p>
                      Compliance status from saved applications.
                    </p>
                  </div>

                </div>

                <div className="metrics-grid">

                  <div className="metric-card">

                    <div className="metric-icon orange">
                      <ClipboardCheck size={20} />
                    </div>

                    <div>
                      <span className="metric-label">
                        Pending compliance
                      </span>

                      <strong>
                        {statistics?.pending_compliance ?? 0}
                      </strong>
                    </div>

                  </div>

                  <div className="metric-card">

                    <div className="metric-icon purple">
                      <AlertTriangle size={20} />
                    </div>

                    <div>
                      <span className="metric-label">
                        Non-compliant
                      </span>

                      <strong>
                        {statistics?.non_compliant ?? 0}
                      </strong>
                    </div>

                  </div>

                </div>

                {/* UPDATE COMPLIANCE STATUS */}

                {isOfficial && (
                <div className="workflow-actions">

                  <h3>Compliance status management</h3>

                  <p className="form-help">
                    Update the compliance status of saved applications.
                  </p>

                  {applications.map((app) => (

                    <div
                      className="readiness-row"
                      key={app.id}
                    >

                      <div>
                        <strong>
                          #{app.id} · {app.institution}
                        </strong>

                        <span>{app.compliance}</span>
                      </div>

                      <select
                        aria-label={`Update compliance for application ${app.id}`}
                        value={app.compliance}
                        onChange={(event) =>
                          updateComplianceStatus(
                            app.id,
                            event.target.value
                          )
                        }
                      >

                        <option>Pending</option>
                        <option>Compliant</option>
                        <option>Non-Compliant</option>
                        <option>Under Review</option>

                      </select>

                    </div>

                  ))}

                </div>
                )}

              </section>

            </>
          )}

          {/* =================================================
              ALERT MANAGEMENT
          ================================================= */}

          {activePage === "Alert Management" && (
            <>

              <SectionHeading
                eyebrow="NOTIFICATIONS"
                title="Alert Management"
                description="Review and manage system alerts."
                action={
                  <button
                    className="button secondary"
                    type="button"
                    onClick={markAllRead}
                  >
                    <CheckCircle2 size={16} />
                    Mark all read
                  </button>
                }
              />

              {/* ALERT SUMMARY */}

              <div className="alert-summary-grid">

                <section className="panel alert-summary">

                  <div className="metric-icon orange">
                    <Bell size={19} />
                  </div>

                  <div>
                    <span className="metric-label">
                      Unread alerts
                    </span>

                    <strong>{unreadAlerts}</strong>
                  </div>

                </section>

                <section className="panel alert-summary">

                  <div className="metric-icon blue">
                    <Activity size={19} />
                  </div>

                  <div>
                    <span className="metric-label">
                      Active alerts
                    </span>

                    <strong>{alerts.length}</strong>
                  </div>

                </section>

              </div>

              {/* ALERT INBOX */}

              <section className="panel">

                <div className="panel-header">

                  <div>
                    <h2>Alert inbox</h2>

                    <p>
                      Current prototype alerts. External
                      notification delivery is not yet configured.
                    </p>
                  </div>

                </div>

                {alerts.length > 0 ? (

                  <div className="alert-list">

                    {alerts.map((alert) => (

                      <article
                        key={alert.id}
                        className={`alert-item ${
                          alert.read ? "read" : ""
                        }`}
                      >

                        <div className="alert-icon">
                          <AlertTriangle size={19} />
                        </div>

                        <div className="alert-copy">

                          <div className="alert-title-line">

                            <h3>{alert.title}</h3>

                            {!alert.read && (
                              <span className="unread-dot" />
                            )}

                          </div>

                          <p>{alert.detail}</p>

                          <small>
                            Prototype system alert
                          </small>

                        </div>

                        <div className="alert-actions">

                          {!alert.read && (
                            <button
                              className="text-button"
                              type="button"
                              onClick={() =>
                                markAlertRead(alert.id)
                              }
                            >
                              Mark read
                            </button>
                          )}

                          <button
                            className="text-button danger-text"
                            type="button"
                            onClick={() =>
                              dismissAlert(alert.id)
                            }
                          >
                            Dismiss
                          </button>

                        </div>

                      </article>

                    ))}

                  </div>

                ) : (

                  <div className="empty-state">

                    <Bell size={25} />

                    <strong>All clear</strong>

                    <span>
                      All sample alerts have been dismissed.
                    </span>

                    <button
                      className="button secondary"
                      type="button"
                      onClick={() =>
                        setAlerts(initialAlerts)
                      }
                    >
                      Restore sample alerts
                    </button>

                  </div>

                )}

              </section>

            </>
          )}

          {/* FOOTER */}

          <footer className="page-footer">

            <span>SIH 2026 · PS26262</span>

            <span>
              Integrated AICTE Approval Workflow Automation
            </span>

          </footer>

        </div>

      </main>

    </div>
  );
}