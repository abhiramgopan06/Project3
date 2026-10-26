import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="empty section">
      <h1>404</h1>
      <p>Page not found.</p>
      <Link className="btn primary" to="/">
        Back home
      </Link>
    </div>
  );
}
