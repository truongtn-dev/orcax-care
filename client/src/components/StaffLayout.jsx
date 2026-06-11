import PortalShell from "./PortalShell.jsx";

const STAFF_SECTIONS = [
  {
    label: "Workspace",
    items: [
      {
        to: "/staff",
        label: "Overview",
        icon: "grid",
        match: ["/staff"],
      },
      {
        to: "/search-doctors",
        label: "Find doctors",
        icon: "doctor",
        match: ["/search-doctors"],
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        to: "/profile",
        label: "Profile",
        icon: "user",
        match: ["/profile"],
      },
      {
        to: "/change-password",
        label: "Change password",
        icon: "layers",
        match: ["/change-password"],
      },
    ],
  },
];

export default function StaffLayout({ children, title, actions }) {
  return (
    <PortalShell
      portalLabel="Staff"
      homeLink="/staff"
      sections={STAFF_SECTIONS}
      title={title || "Staff overview"}
      actions={actions}
    >
      {children}
    </PortalShell>
  );
}
