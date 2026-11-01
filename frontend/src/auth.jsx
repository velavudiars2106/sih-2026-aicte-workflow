import { useState } from "react";
import "./auth.css";

const API_BASE = "http://127.0.0.1:8000";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    institution_name: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      let response;

      if (mode === "register") {
        const payload = {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          institution_name: form.institution_name.trim(),
        };

        response = await fetch(
          `${API_BASE}/api/auth/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof result.detail === "string"
              ? result.detail
              : JSON.stringify(result.detail || result)
          );
        }

        setMessageType("success");
        setMessage(
          "Registration successful. Wait for AICTE official verification, then log in."
        );

        setMode("login");

        setForm((previous) => ({
          ...previous,
          password: "",
        }));

        return;
      }

      // LOGIN
      const loginData = new URLSearchParams();

      loginData.append("username", form.email.trim());
      loginData.append("password", form.password);

      response = await fetch(
        `${API_BASE}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: loginData.toString(),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(result.detail || result)
        );
      }

      if (!result.access_token) {
        throw new Error("Login response did not contain an access token.");
      }

      if (!result.user) {
        throw new Error(
          "Login response did not contain user information."
        );
      }

      // Save token before opening the dashboard.
      sessionStorage.setItem(
        "access_token",
        result.access_token
      );

      setMessageType("success");
      setMessage("Login successful.");

      onLogin(result);

    } catch (error) {
      console.error("Authentication error:", error);

      setMessageType("error");
      setMessage(error.message || "Something went wrong.");

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-brand">

          <div className="auth-logo">
            AI
          </div>

          <h1>AICTE WORKFLOW</h1>

          <p>
            Approval Workflow Automation System
          </p>

          <span>SIH 2026 · PS26262</span>

        </div>

        <div className="auth-heading">

          <h2>
            {mode === "login"
              ? "Welcome back"
              : "Create institution account"}
          </h2>

          <p>
            {mode === "login"
              ? "Sign in to access your dashboard."
              : "Register your institution to submit applications."}
          </p>

        </div>

        <form onSubmit={handleSubmit}>

          {mode === "register" && (
            <>
              <label>
                Full name

                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={updateField}
                  placeholder="Enter your full name"
                  minLength={2}
                  required
                />
              </label>

              <label>
                Institution name

                <input
                  type="text"
                  name="institution_name"
                  value={form.institution_name}
                  onChange={updateField}
                  placeholder="Enter institution name"
                  minLength={2}
                  required
                />
              </label>
            </>
          )}

          <label>
            Email address

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              placeholder="Enter your registered email"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              placeholder="Enter your password"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              minLength={8}
              required
            />
          </label>

          {message && (
            <div
              className={`auth-message ${messageType}`}
              role="alert"
            >
              {message}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Register institution"}
          </button>

        </form>

        <div className="auth-switch">

          {mode === "login" ? (
            <>
              Don't have an institution account?

              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setMessage("");
                }}
              >
                Register here
              </button>
            </>
          ) : (
            <>
              Already registered?

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
              >
                Sign in
              </button>
            </>
          )}

        </div>

        <div className="auth-footer">
          All India Council for Technical Education
        </div>

      </div>

    </div>
  );
}