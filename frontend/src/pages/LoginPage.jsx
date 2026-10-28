import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";
import { savePending } from "../verification";
import AuthLayout from "../components/AuthLayout";
import GoogleButton from "../components/GoogleButton";

export default function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const notice = location.state && location.state.notice;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function finishLogin(data) {
    localStorage.setItem("token", data.token);
    setUser(data.user);
    if (data.user.is_staff) {
      navigate("/admin-dashboard");
    } else if (data.user.role === "organizer") {
      navigate("/organizer");
    } else {
      navigate("/");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) {
      return;
    }

    setError("");
    setGoogleError("");
    setSubmitting(true);

    try {
      const response = await api.post("/auth/login/", {
        username: form.username.trim(),
        password: form.password,
      });
      finishLogin(response.data);
    } catch (err) {
      const data = err.response && err.response.data;
      if (data && data.email_not_verified) {
        savePending(data.email, 0, false);
        navigate("/verify-email", { state: { email: data.email, sendNow: true } });
        return;
      }
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={handleSubmit}>
        <span className="eyebrow">WELCOME BACK</span>
        <h1>Sign in</h1>
        <p className="auth-sub">Enter your details to access your account.</p>

        {notice && <div className="alert success">{notice}</div>}

        <label className="field">
          <span>Username</span>
          <input
            name="username"
            placeholder="Your username"
            autoComplete="username"
            required
            value={form.username}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <div className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              autoComplete="current-password"
              required
              minLength={6}
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error && <div className="alert error">{error}</div>}

        <button className="btn primary wide big" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="muted center">
          New here? <Link to="/register">Create an account</Link>
        </p>

        <div className="divider">
          <span>or</span>
        </div>

        <GoogleButton
          onSuccess={finishLogin}
          onError={function (message) {
            setError("");
            setGoogleError(message);
          }}
        />
        {googleError && <div className="alert error">{googleError}</div>}
      </form>
    </AuthLayout>
  );
}
