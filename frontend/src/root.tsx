// src/root.tsx
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import "./index.css";
import "./styles/global.scss";
import "rsuite-table/dist/css/rsuite-table.css";
import "rsuite/dist/rsuite.min.css";
import { AuthProvider } from "./components/hooks/useAuth";
import { FlashProvider } from "./components/Flash/useFlash";
import FlashMessage from "./components/Flash/Flash";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AuthProvider>
          <FlashProvider>
            {children}
            <FlashMessage />
          </FlashProvider>
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
