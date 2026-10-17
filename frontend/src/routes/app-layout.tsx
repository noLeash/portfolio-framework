// src/routes/app-layout.tsx
import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../components/hooks/useAuth";

export default function AppLayout() {
  const { isAuthenticated, logout } = useAuth();
  return (
    <div>
      <header className="site-header">
        <div className="site-header__inner">
          <nav>
            <div>
              <h1>
                <Link
                  style={{ textDecoration: "none", color: "inherit" }}
                  to="/"
                >
                  FrameWork™
                </Link>
              </h1>
            </div>
            {/* {
              <NavLink to="/" end>
                Public
              </NavLink>
            } */}

            {isAuthenticated && (
              <>
                {" - "}
                <NavLink to="/" end>
                  Home
                </NavLink>
                {" - "}
                <NavLink to="/dashboard">Dashboard</NavLink>
                {" - "}
                <Link onClick={logout} to={"/login"}>
                  Logout
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
