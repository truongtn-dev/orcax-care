import AppHeader from "./AppHeader.jsx";
import AppFooter from "./AppFooter.jsx";

export default function PageLayout({ children, auth = false, fullWidth = false }) {
  return (
    <div className={`page ${auth ? "page-auth" : ""}`}>
      <AppHeader />
      <main className={`main ${auth ? "main-auth" : ""} ${fullWidth ? "main-full" : ""}`}>{children}</main>
      <AppFooter />
    </div>
  );
}
