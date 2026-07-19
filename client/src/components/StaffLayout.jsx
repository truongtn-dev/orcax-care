import { useEffect, useMemo, useState } from "react";
import PortalShell from "./PortalShell.jsx";
import { StaffApiClient } from "../services/staffApi.js";

const BASE_SECTIONS = [
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
        to: "/staff/pharmacy?lowStockOnly=1",
        label: "Pharmacy",
        icon: "layers",
        match: ["/staff/pharmacy"],
        badgeKey: "lowStock",
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
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    StaffApiClient.getPharmacyDashboard()
      .then(({ data }) => {
        if (!cancelled) setLowStockCount(data.lowStockCount || 0);
      })
      .catch(() => {
        if (!cancelled) setLowStockCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(
    () =>
      BASE_SECTIONS.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          if (item.badgeKey === "lowStock") {
            const { badgeKey, ...rest } = item;
            return { ...rest, badge: lowStockCount };
          }
          return item;
        }),
      })),
    [lowStockCount]
  );

  return (
    <PortalShell
      portalLabel="Staff"
      homeLink="/staff"
      sections={sections}
      title={title || "Staff overview"}
      description={description}
      actions={actions}
    >
      {children}
    </PortalShell>
  );
}
