import PortalShell from "./PortalShell.jsx";

const DOCTOR_SECTIONS = [
  {
    label: "Main",
    items: [
      {
        to: "/doctor",
        label: "Dashboard",
        icon: "grid",
        match: ["/doctor"],
      },
    ],
  },
  {
    label: "Clinical work",
    items: [
      {
        to: "/doctor/schedule",
        label: "Calendar",
        icon: "calendar",
        match: ["/doctor/schedule"],
      },
      {
        to: "/doctor/today-appointments",
        label: "Today appointments",
        icon: "list",
        match: ["/doctor/today-appointments"],
      },
      {
        to: "/doctor/prescriptions",
        label: "My prescriptions",
        icon: "pill",
        match: ["/doctor/prescriptions"],
      },
      {
        to: "/doctor/queue",
        label: "Queue session",
        icon: "list",
        match: ["/doctor/queue"],
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

export default function DoctorLayout({ children, title, description, actions }) {
  return (
    <PortalShell
      portalLabel="Doctor"
      homeLink="/doctor"
      sections={DOCTOR_SECTIONS}
      title={title || "Doctor dashboard"}
      description={description}
      actions={actions}
    >
      {children}
    </PortalShell>
  );
}
