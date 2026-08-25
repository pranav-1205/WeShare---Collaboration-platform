import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

const THEME_KEY = "weshare-theme";

function getInitialTheme() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return "system";
  }
  return "system";
}

function getEffectiveTheme(theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      setThemeState(stored);
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const stored = localStorage.getItem(THEME_KEY);
      if (!stored || stored === "system") {
        setThemeState("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    if (newTheme === "system") {
      localStorage.removeItem(THEME_KEY);
      const effectiveTheme = getEffectiveTheme("system");
      document.documentElement.setAttribute("data-theme", effectiveTheme);
    } else {
      localStorage.setItem(THEME_KEY, newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const effectiveTheme = getEffectiveTheme(theme);
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  }, [theme]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}