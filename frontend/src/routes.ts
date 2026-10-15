// src/routes.ts
import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  layout("./routes/app-layout.tsx", [
    index("./routes/home.tsx"),
    route("dashboard", "./components/AdminDash/AdminDash.tsx"),
    route("login", "./components/Login/Login.tsx"),
  ]),
] satisfies RouteConfig;
