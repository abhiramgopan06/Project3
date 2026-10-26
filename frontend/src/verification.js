const KEY = "pendingVerification";

export function savePending(email, resendInSeconds, devMode) {
  sessionStorage.setItem(
    KEY,
    JSON.stringify({
      email: email,
      nextResendAt: Date.now() + (resendInSeconds || 0) * 1000,
      devMode: Boolean(devMode),
    })
  );
}

export function readPending() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || null;
  } catch (e) {
    return null;
  }
}

export function clearPending() {
  sessionStorage.removeItem(KEY);
}

export function maskEmail(email) {
  const parts = String(email || "").split("@");
  if (parts.length !== 2) {
    return email;
  }
  const name = parts[0];
  const visible = name.slice(0, Math.min(2, name.length));
  return visible + "•••@" + parts[1];
}
