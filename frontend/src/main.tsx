import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./styles/global.scss";
import "rsuite-table/dist/css/rsuite-table.css";
import { AuthProvider } from "./components/hooks/useAuth.tsx";

// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <AuthProvider>
//       <App />
//     </AuthProvider>
//   </StrictMode>,
// );
