import { useAuth } from "../components/hooks/useAuth";
import Login from "../components/Login/Login";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    return (
      <>
        <h2>Home Page</h2> <h3>User: {user?.sub}</h3>Logged In
      </>
    );
  } else {
    return (
      <>
        Log in:
        <Login />
      </>
    );
  }
}
