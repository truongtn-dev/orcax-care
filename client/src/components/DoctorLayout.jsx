import PortalShell from "./PortalShell.jsx";

const DOCTOR_SECTIONS = [
  {
    label: "Clinical work",
    items: [
      {
        to: "/doctor/schedule",
        label: "Calendar",
        icon: "calendar",
        match: ["/doctor/schedule", "/doctor"],
      },
      {
        to: "/doctor/today-appointments",
        label: "Today appointments",
        icon: "list",
        match: ["/doctor/today-appointments"],
      },
      {
        to: "/doctor/work-shifts",
        label: "Work shifts",
        icon: "clock",
        match: ["/doctor/work-shifts"],
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
    ],
  },
];

export default function DoctorLayout({ children, title, actions }) {
  return (
    <PortalShell
      portalLabel="Doctor"
      homeLink="/doctor/schedule"
      sections={DOCTOR_SECTIONS}
      title={title || "My calendar"}
      actions={actions}
    >
      {children}
    </PortalShell>
  );
}
