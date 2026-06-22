import { Navigate } from "react-router-dom";

export default function CreatePatientPage() {
  return <Navigate to="/admin/patients?create=1" replace />;
}
