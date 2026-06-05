import AppHeader from "./AppHeader.jsx";
import AppFooter from "./AppFooter.jsx";

export default function PageLayout({ children, auth = false, constrained = false, dashboard = false }) {
  const mainClass = [
    "main",
    auth ? "main-auth" : dashboard ? "main-dashboard" : constrained ? "main-constrained" : "main-fluid",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`page ${auth ? "page-auth" : ""} ${dashboard ? "page-dashboard" : ""}`}>
      {!auth && !dashboard && <AppHeader />}
      <main className={mainClass}>{children}</main>
      {!auth && !dashboard && <AppFooter />}
    </div>
  );
}
