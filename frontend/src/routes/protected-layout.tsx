import { Outlet } from "react-router";
import { useAuth } from "../components/hooks/useAuth";
import NotAuthorized from "../components/Login/NotAuthorized.tsx";

export default function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <NotAuthorized />;
  return <Outlet />;
}
    