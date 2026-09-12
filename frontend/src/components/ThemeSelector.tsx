// frontend/src/components/ThemeSelector.tsx
import { useState, useRef, useEffect } from "react";
import { useTheme, THEME_OPTIONS, type ThemeKey } from "../context/ThemeContext";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="theme-selector" ref={dropdownRef}>
      <button
        type="button"
        className="theme-selector__button"
        onClick={() => setIsOpen(!isOpen)}
        title="Change UI Theme"
        aria-expanded={isOpen}
      >
        <span className="theme-selector__icon">{currentOption.icon}</span>
        <span className="theme-selector__name">{currentOption.name}</span>
        <span className="theme-selector__color-dot" style={{ backgroundColor: currentOption.badgeColor }} />
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="theme-selector__dropdown card">
          <div className="theme-selector__header">
            <span>Select UI Theme</span>
          </div>
          <div className="theme-selector__list">
            {THEME_OPTIONS.map((opt) => {
              const isActive = opt.id === theme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`theme-selector__option ${isActive ? "theme-selector__option--active" : ""}`}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="theme-selector__option-left">
                    <span className="theme-selector__option-icon">{opt.icon}</span>
                    <span className="theme-selector__option-name">{opt.name}</span>
                  </div>
                  <div className="theme-selector__option-right">
                    <span className="theme-selector__color-dot" style={{ backgroundColor: opt.badgeColor }} />
                    {isActive && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
