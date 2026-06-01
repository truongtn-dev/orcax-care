import AppHeader from "./AppHeader.jsx";

export default function PageLayout({ children, narrow = false }) {
  return (
    <div className="page">
      <AppHeader />
      <main className={`main ${narrow ? "main-narrow" : ""}`}>{children}</main>
    </div>
  );
}
