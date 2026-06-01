import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function HomePage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <section className="hero card">
        <h1>Welcome to OrcaXCare</h1>
        <p className="hero-sub">
          {fullName ? `Hello, ${fullName}.` : "Your trusted healthcare portal."}
          {" "}Search doctors, manage your profile, and access care services.
        </p>
        <div className="hero-actions">
          <Link to="/search-doctors" className="btn btn-primary">
            Find Doctors
          </Link>
          <Link to="/register" className="btn btn-outline">
            Register as Patient
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
