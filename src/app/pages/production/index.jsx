import { Navigate } from "react-router";

export default function ProductionRedirect() {
  return <Navigate to="/machine-production" replace />;
}
