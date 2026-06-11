import { useLocation, useSearchParams } from "react-router-dom";

import PortalShell from "./PortalShell.jsx";

import "./AdminLayout.css";



const TAB_META = {

  overview: { title: "Overview" },

  departments: { title: "Departments" },

};



const ADMIN_SECTIONS = [

  {

    label: "Main",

    items: [

      {

        to: "/admin",

        label: "Dashboard",

        icon: "grid",

        tab: "overview",

      },

    ],

  },

  {

    label: "People",

    items: [

      {

        to: "/admin/account",

        label: "Account list",

        icon: "users",

        match: ["/admin/account", "/admin/accounts"],

      },

      {

        to: "/admin/staff",

        label: "Staff",

        icon: "staff",

        match: ["/admin/staff"],

      },

      {

        to: "/admin/patients",

        label: "Patients",

        icon: "users",

        match: ["/admin/patients", "/admin/patient"],

      },

      {

        to: "/admin/doctors",

        label: "Doctors",

        icon: "doctor",

        match: ["/admin/doctors"],

      },

    ],

  },

  {

    label: "Master data",

    items: [

      {

        to: "/admin/specialty",

        label: "Specialties",

        icon: "stethoscope",

        match: ["/admin/specialty", "/admin/specialties"],

      },

      {

        to: "/admin/clinic-room",

        label: "Clinic rooms",

        icon: "building",

        match: ["/admin/clinic-room"],

      },

      {

        to: "/admin?tab=departments",

        label: "Departments",

        icon: "layers",

        tab: "departments",

        match: ["/admin/departments"],

      },

    ],

  },

  {

    label: "Scheduling",

    items: [

      {

        to: "/admin/work-shifts",

        label: "Work shifts",

        icon: "clock",

        match: ["/admin/work-shifts"],

      },

      {

        to: "/admin/appointment-slots/generate",

        label: "Generate slots",

        icon: "sparkles",

        match: ["/admin/appointment-slots"],

      },

    ],

  },

];



export default function AdminLayout({ children, title, actions }) {

  const location = useLocation();

  const [searchParams] = useSearchParams();



  const isDashboard = location.pathname === "/admin";

  const activeTab = searchParams.get("tab") || "overview";

  const tabMeta = isDashboard ? TAB_META[activeTab] : null;

  const pageTitle = title || tabMeta?.title || "System administration";



  return (

    <PortalShell

      portalLabel="Admin"

      homeLink="/admin"

      sections={ADMIN_SECTIONS}

      title={pageTitle}

      actions={actions}

    >

      {children}

    </PortalShell>

  );

}

