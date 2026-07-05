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
        to: "/staff/pharmacy",
        label: "Pharmacy",
        icon: "layers",
        match: ["/staff/pharmacy"],
      },
      {
        to: "/staff/prescriptions/verify",
        label: "Verify Rx",
        icon: "scan",
        match: ["/staff/prescriptions/verify"],
      },
      {
        to: "/staff/checkin",
        label: "Queue check-in",
        icon: "list",
        match: ["/staff/checkin"],
      },
      {
        to: "/staff/branch",
        label: "My branch",
        icon: "building",
        match: ["/staff/branch"],
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

export default function StaffLayout({ children, title, description, actions }) {
  return (
    <PortalShell
      portalLabel="Staff"
      homeLink="/staff"
      sections={STAFF_SECTIONS}
      title={title || "Staff overview"}
      description={description}
      actions={actions}
    >
      {children}
    </PortalShell>
  );
}
