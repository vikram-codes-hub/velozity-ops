// frontend/src/context/ThemeContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeKey = "obsidian" | "cyberpunk" | "emerald" | "sunset" | "pearl";

export interface ThemeOption {
  id: ThemeKey;
  name: string;
  badgeColor: string;
  icon: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "obsidian", name: "Obsidian Tech", badgeColor: "#6366f1", icon: "🌌" },
  { id: "cyberpunk", name: "Cyber Neon", badgeColor: "#06b6d4", icon: "⚡" },
  { id: "emerald", name: "Midnight Emerald", badgeColor: "#10b981", icon: "🌿" },
  { id: "sunset", name: "Sunset Rose", badgeColor: "#f43f5e", icon: "🌅" },
  { id: "pearl", name: "Pearl Light", badgeColor: "#4f46e5", icon: "✨" },
];

interface ThemeContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "velozity-ops-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved;
    }
    return "obsidian";
  });

  const setTheme = (newTheme: ThemeKey) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
