import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type FlashType = "info" | "success" | "warning" | "error";

export interface FlashAlert {
  message: string;
  type: FlashType;
}

interface FlashContextType {
  alert: FlashAlert | null;
  flash: (message: string, type?: FlashType, duration?: number) => void;
  clear: () => void;
}

const FlashContext = createContext<FlashContextType | undefined>(undefined);

type FlashProviderProps = {
  children: ReactNode;
};

export const FlashProvider = ({ children }: FlashProviderProps) => {
  const [alert, setAlert] = useState<FlashAlert | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAlert(null);
  }, []);

  const flash = useCallback(
    (message: string, type: FlashType = "info", duration = 3000) => {
      clear();
      setAlert({ message, type });

      timeoutRef.current = window.setTimeout(() => {
        setAlert(null);
        timeoutRef.current = null;
      }, duration);
    },
    [clear],
  );

  return (
    <FlashContext.Provider value={{ alert, flash, clear }}>
      {children}
    </FlashContext.Provider>
  );
};

export const useFlash = (): FlashContextType => {
  const context = useContext(FlashContext);

  if (!context) {
    throw new Error("useFlash must be used within a FlashProvider");
  }

  return context;
};
