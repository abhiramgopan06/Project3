export default function AuthLayout({ children }) {
  return (
    <div className="auth-wrap">
      <div className="auth-shell">
        <aside className="auth-aside">
          <div className="auth-brand">
            <span className="auth-brand-mark">✦</span> Evently
          </div>
          <h2>Discover, plan and attend events — all in one place.</h2>
          <ul className="auth-points">
            <li>Book seats on a live seating map</li>
            <li>Create and manage your own events</li>
            <li>Secure sign-in with email verification</li>
          </ul>
        </aside>

        <section className="auth-panel">{children}</section>
      </div>
    </div>
  );
}
