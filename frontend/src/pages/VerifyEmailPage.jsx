import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialUsername = params.get("username") || "";
  const email = params.get("email") || "";

  const [username, setUsername] = useState(initialUsername);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendAvailable, setResendAvailable] = useState(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) {
      setResendAvailable(true);
      return undefined;
    }
    const timer = setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const response = await api.post("/auth/verify-email/", {
        username: username.trim(),
        otp: otp.trim(),
      });
      setMessage(response.data.message);
      setTimeout(() => navigate("/login", { state: { verified: true } }), 900);
    } catch (err) {
      setError(getErrorMessage(err, "The verification code could not be checked."));
      setSubmitting(false);
    }
  }

  async function resendCode() {
    if (resending || !resendAvailable || !username.trim()) return;

    setError("");
    setMessage("");
    setResending(true);
    try {
      const response = await api.post("/auth/resend-otp/", { username: username.trim() });
      setMessage(response.data.message);
      setOtp("");
      setResendAvailable(false);
      setSeconds(60);
    } catch (err) {
      setError(getErrorMessage(err, "We could not send a new code."));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card verification-card" onSubmit={handleSubmit}>
        <div className="verification-icon">✉</div>
        <span className="eyebrow">EMAIL VERIFICATION</span>
        <h1>Check your email</h1>
        <p className="muted center">
          We sent a 6-digit verification code to
          <strong className="verification-email"> {email || "your registered email"}</strong>.
        </p>

        <label className="field-label" htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Your username"
          required
          autoComplete="username"
        />

        <label className="field-label" htmlFor="otp">Verification code</label>
        <input
          id="otp"
          className="otp-input"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
        />

        {error && <div className="error">{error}</div>}
        {message && <div className="notice">{message}</div>}

        <button className="btn primary wide" disabled={submitting || otp.length !== 6}>
          {submitting ? "Verifying..." : "Verify email"}
        </button>

        <div className="resend-row">
          <span className="muted">Didn't receive the code?</span>
          <button type="button" className="text-button" onClick={resendCode} disabled={!resendAvailable || resending}>
            {resending ? "Sending..." : resendAvailable ? "Send again" : `Send again in ${seconds}s`}
          </button>
        </div>

        <p className="small-note center">
          The code expires after 10 minutes. You can request a new code if needed.
        </p>
        <Link className="back-link" to="/register">← Back to registration</Link>
      </form>
    </div>
  );
}
