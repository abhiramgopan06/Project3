import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";
import { clearPending, maskEmail, readPending, savePending } from "../verification";
import AuthLayout from "../components/AuthLayout";

const OTP_LENGTH = 6;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [pending] = useState(readPending);
  const [email] = useState(function () {
    return (location.state && location.state.email) || (pending && pending.email) || "";
  });

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [warning, setWarning] = useState((location.state && location.state.warning) || "");
  const [devMode, setDevMode] = useState(Boolean(pending && pending.devMode));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [nextResendAt, setNextResendAt] = useState((pending && pending.nextResendAt) || 0);
  const [now, setNow] = useState(Date.now());
  const secondsLeft = Math.max(0, Math.ceil((nextResendAt - now) / 1000));

  const boxes = useRef([]);
  const sentOnOpen = useRef(false);

  useEffect(
    function () {
      if (secondsLeft <= 0) {
        return;
      }
      const timer = setInterval(function () {
        setNow(Date.now());
      }, 1000);
      return function () {
        clearInterval(timer);
      };
    },
    [secondsLeft > 0]
  );

  useEffect(function () {
    if (email && location.state && location.state.sendNow && !sentOnOpen.current) {
      sentOnOpen.current = true;
      resendCode();
    }
  }, []);

  if (!email) {
    return <Navigate to="/register" replace />;
  }

  function startCountdown(seconds) {
    const when = Date.now() + seconds * 1000;
    setNextResendAt(when);
    setNow(Date.now());
    return when;
  }

  function focusBox(index) {
    const box = boxes.current[index];
    if (box) {
      box.focus();
      box.select();
    }
  }

  function setDigit(index, value) {
    const copy = digits.slice();
    copy[index] = value;
    setDigits(copy);
  }

  function handleChange(index, e) {
    let typed = e.target.value.replace(/\D/g, "");
    setError("");

    if (typed.length === 2 && digits[index] !== "") {
      typed = typed.replace(digits[index], "");
    }

    if (typed.length === 0) {
      setDigit(index, "");
      return;
    }
    if (typed.length > 1) {
      fillFrom(index, typed);
      return;
    }
    setDigit(index, typed);
    if (index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  }

  function fillFrom(start, text) {
    const copy = digits.slice();
    for (let i = 0; i < text.length && start + i < OTP_LENGTH; i++) {
      copy[start + i] = text[i];
    }
    setDigits(copy);
    focusBox(Math.min(start + text.length, OTP_LENGTH - 1));
  }

  function handlePaste(index, e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (text.length > 0) {
      e.preventDefault();
      setError("");
      fillFrom(index, text);
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      focusBox(index - 1);
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusBox(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (submitting || successMessage) {
      return;
    }
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      setError("Please enter all " + OTP_LENGTH + " digits.");
      return;
    }

    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const response = await api.post("/auth/verify-otp/", { email: email, otp: code });
      clearPending();
      setSuccessMessage(response.data.message);
      setTimeout(function () {
        navigate("/login", { state: { notice: response.data.message }, replace: true });
      }, 1800);
    } catch (err) {
      setError(getErrorMessage(err, "Could not verify the code. Please try again."));
      setDigits(Array(OTP_LENGTH).fill(""));
      setSubmitting(false);
      focusBox(0);
    }
  }

  async function resendCode() {
    if (resending) {
      return;
    }
    setError("");
    setInfo("");
    setWarning("");
    setResending(true);
    try {
      const response = await api.post("/auth/resend-otp/", { email: email });
      const when = startCountdown(response.data.resend_in);
      savePending(email, response.data.resend_in, response.data.dev_mode);
      setDevMode(Boolean(response.data.dev_mode));
      setInfo(response.data.detail);
      setDigits(Array(OTP_LENGTH).fill(""));
      focusBox(0);
      return when;
    } catch (err) {
      const data = err.response && err.response.data;
      if (data && data.retry_after) {
        startCountdown(data.retry_after);
      }
      setError(getErrorMessage(err, "Could not send a new code. Please try again."));
    } finally {
      setResending(false);
    }
  }

  const complete = digits.every(function (d) {
    return d !== "";
  });

  if (successMessage) {
    return (
      <AuthLayout>
        <div className="auth-form center-block">
          <div className="success-check">✓</div>
          <h1>Email verified</h1>
          <p className="auth-sub">{successMessage}</p>
          <Link className="btn primary wide big" to="/login" state={{ notice: successMessage }}>
            Go to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={handleVerify}>
        <span className="eyebrow">VERIFY YOUR EMAIL</span>
        <h1>Enter the code</h1>
        <p className="auth-sub">
          We sent a {OTP_LENGTH}-digit code to <strong>{maskEmail(email)}</strong>. It expires in 10 minutes.
        </p>

        {devMode && (
          <div className="alert info">
            Email is not set up on the server yet, so the code was printed in the backend (Django) terminal window.
          </div>
        )}
        {warning && <div className="alert error">{warning}</div>}
        {info && <div className="alert success">{info}</div>}

        <div className="otp-row">
          {digits.map(function (digit, index) {
            return (
              <input
                key={index}
                ref={function (el) {
                  boxes.current[index] = el;
                }}
                className={"otp-box" + (error ? " has-error" : "")}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={"Digit " + (index + 1)}
                maxLength={OTP_LENGTH}
                value={digit}
                autoFocus={index === 0}
                onFocus={function (e) {
                  e.target.select();
                }}
                onChange={function (e) {
                  handleChange(index, e);
                }}
                onKeyDown={function (e) {
                  handleKeyDown(index, e);
                }}
                onPaste={function (e) {
                  handlePaste(index, e);
                }}
              />
            );
          })}
        </div>

        {error && <div className="alert error">{error}</div>}

        <button className="btn primary wide big" disabled={submitting || !complete}>
          {submitting ? "Verifying..." : "Verify email"}
        </button>

        <div className="resend-row">
          <span className="muted">Didn't get the code?</span>
          <button
            type="button"
            className="link-btn"
            onClick={resendCode}
            disabled={secondsLeft > 0 || resending}
          >
            {resending ? "Sending..." : secondsLeft > 0 ? "Resend OTP in " + secondsLeft + "s" : "Resend OTP"}
          </button>
        </div>

        <p className="muted center small-text">
          Wrong email? <Link to="/register">Start again</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
