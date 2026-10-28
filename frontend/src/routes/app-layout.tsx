// src/routes/app-layout.tsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigationType,
} from "react-router";
import { useAuth } from "../components/hooks/useAuth";
import IndexSidebar from "../components/Index/IndexSidebar";

export default function AppLayout() {
  const { isAuthenticated, logout } = useAuth();
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();
  // scroll position of each history entry, so Back/Forward return to it
  const scrollPositions = useRef(new Map<string, number>());
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Publish the header's height so the main area can start below it
  useLayoutEffect(() => {
    const shell = shellRef.current;
    const header = headerRef.current;
    if (!shell || !header) return;
    const observer = new ResizeObserver(() =>
      shell.style.setProperty(
        "--site-header-height",
        `${header.offsetHeight}px`,
      ),
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // <ScrollRestoration> only handles the window, but .site-main is what
  // scrolls. New pages (and reloads) start at the top; Back/Forward restore.
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.scrollTop =
      navigationType === "POP"
        ? (scrollPositions.current.get(location.key) ?? 0)
        : 0;
  }, [location.key]);

  // Close the navigation when the URL changes
  useEffect(() => {
    setIsIndexOpen(false);
  }, [location.pathname, location.search, location.hash]);

  return (
    <div ref={shellRef} className="app-shell">
      <header className="site-header" ref={headerRef}>
        <div className="site-header__inner">
          {/* <nav> */}
          <div>
            <h2>
              <Link style={{ textDecoration: "none", color: "inherit" }} to="/">
                Greg Comollo
              </Link>
            </h2>
          </div>
          {/* {
              <NavLink to="/" end>
                Public
              </NavLink>
            } */}

          {isAuthenticated && (
            <>
              <NavLink to="/edit" end>
                Edit
              </NavLink>
              {" - "}
              <NavLink to="/collections">Collections</NavLink>
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
          {/* </nav> */}
        </div>
        <button
          type="button"
          className="site-header__index-toggle"
          aria-expanded={isIndexOpen}
          aria-controls="index-sidebar"
          onClick={() => setIsIndexOpen((open) => !open)}
        >
          <h3>Navigation</h3>
        </button>
      </header>

      <IndexSidebar
        id="index-sidebar"
        open={isIndexOpen}
        onClose={() => setIsIndexOpen(false)}
      />

      <main
        className="site-main"
        ref={mainRef}
        // recorded as it happens: by the time the next page renders, a
        // shorter page may already have clamped scrollTop
        onScroll={(e) =>
          scrollPositions.current.set(location.key, e.currentTarget.scrollTop)
        }
      >
        <div className="main-container">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <nav className="site-footer__nav">
          {/* <NavLink to="/" end>
            Home
          </NavLink> */}
          <div>
            <NavLink to="/index">
              <h2>Index</h2>
            </NavLink>
          </div>
          <div>
            <NavLink to="/about">
              <h2>About</h2>
            </NavLink>
          </div>
        </nav>
      </footer>
    </div>
  );
}
