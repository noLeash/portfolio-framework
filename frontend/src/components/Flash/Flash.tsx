import { useFlash } from "./useFlash.tsx";

const ALERT_COLORS = {
  success: "green",
  error: "red",
  warning: "orange",
  info: "blue",
} as const;

const FlashMessage = () => {
  const { alert } = useFlash();

  if (!alert) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "12px 16px",
        borderRadius: "8px",
        color: "#fff",
        backgroundColor: ALERT_COLORS[alert.type],
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 9999,
        transition: "opacity 0.5s ease",
      }}
    >
      {alert.message}
    </div>
  );
};

export default FlashMessage;
