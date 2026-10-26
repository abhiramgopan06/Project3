import { useEffect, useRef, useState } from "react";
import api from "../api";
import { getErrorMessage } from "../helpers";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise = null;

function loadGoogleScript() {
  if (window.google && window.google.accounts) {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = function () {
        scriptPromise = null;
        reject(new Error("Google script could not be loaded"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function GoogleButton({ onSuccess, onError }) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const tokenClient = useRef(null);

  const handlers = useRef({ onSuccess: onSuccess, onError: onError });
  handlers.current = { onSuccess: onSuccess, onError: onError };

  useEffect(function () {
    if (!CLIENT_ID) {
      return;
    }
    let cancelled = false;

    loadGoogleScript()
      .then(function () {
        if (cancelled) {
          return;
        }
        tokenClient.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: "openid email profile",
          callback: async function (response) {
            if (response.error || !response.access_token) {
              setBusy(false);
              handlers.current.onError("Google sign-in was cancelled.");
              return;
            }
            try {
              const result = await api.post("/auth/google/", { access_token: response.access_token });
              handlers.current.onSuccess(result.data);
            } catch (err) {
              setBusy(false);
              handlers.current.onError(getErrorMessage(err, "Google sign-in failed. Please try again."));
            }
          },
          error_callback: function (err) {
            setBusy(false);
            if (err && err.type === "popup_failed_to_open") {
              handlers.current.onError("Your browser blocked the Google pop-up. Please allow pop-ups and try again.");
            }
          },
        });
        setReady(true);
      })
      .catch(function () {
      });

    return function () {
      cancelled = true;
    };
  }, []);

  function handleClick() {
    if (!CLIENT_ID) {
      onError("Google sign-in is not set up yet. Add VITE_GOOGLE_CLIENT_ID to frontend/.env (see SETUP_OTP_GOOGLE.md).");
      return;
    }
    if (!ready || !tokenClient.current) {
      onError("Google is still loading. Check your internet connection and try again.");
      return;
    }
    setBusy(true);
    tokenClient.current.requestAccessToken({ prompt: "select_account" });
  }

  return (
    <button type="button" className="social-btn" onClick={handleClick} disabled={busy}>
      <GoogleLogo />
      <span>{busy ? "Waiting for Google..." : "Continue with Google"}</span>
    </button>
  );
}
