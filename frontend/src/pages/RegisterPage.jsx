import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";
import { savePending } from "../verification";
import AuthLayout from "../components/AuthLayout";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "attendee",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/auth/register/", {
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
      });
      const data = response.data;

      savePending(data.email, data.resend_in, data.dev_mode);
      navigate("/verify-email", {
        state: {
          email: data.email,
          warning: data.email_sent ? "" : data.message,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={handleSubmit}>
        <span className="eyebrow">CREATE ACCOUNT</span>
        <h1>Join Evently</h1>
        <p className="auth-sub">We will email you a code to confirm your address.</p>

        <div className="role-switch" role="group" aria-label="Account type">
          <button
            type="button"
            className={form.role === "attendee" ? "active" : ""}
            onClick={() => setForm({ ...form, role: "attendee" })}
          >
            Attendee
          </button>
          <button
            type="button"
            className={form.role === "organizer" ? "active" : ""}
            onClick={() => setForm({ ...form, role: "organizer" })}
          >
            Organizer
          </button>
        </div>
        {form.role === "organizer" && (
          <p className="hint">Organizer accounts need admin approval before you can sign in.</p>
        )}

        <div className="two">
          <label className="field">
            <span>First name</span>
            <input name="first_name" placeholder="First name" value={form.first_name} onChange={handleChange} />
          </label>
          <label className="field">
            <span>Last name</span>
            <input name="last_name" placeholder="Last name" value={form.last_name} onChange={handleChange} />
          </label>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Username</span>
          <input
            name="username"
            placeholder="Choose a username"
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
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
          {submitting ? "Sending code..." : "Create Account"}
        </button>

        <p className="muted center">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
