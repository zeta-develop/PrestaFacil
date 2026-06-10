"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  theme?: "teal" | "blue" | "indigo";
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  theme = "teal",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Focus colors based on theme
  const focusRing = {
    teal: "focus:border-teal-500 focus:ring-teal-500/50",
    blue: "focus:border-blue-500 focus:ring-blue-500/50",
    indigo: "focus:border-indigo-500 focus:ring-indigo-500/50",
  }[theme];

  const activeText = {
    teal: "text-teal-400",
    blue: "text-blue-400",
    indigo: "text-indigo-400",
  }[theme];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Botón Principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl outline-none transition-all shadow-sm dark:shadow-none backdrop-blur-md ${focusRing} ${isOpen ? "ring-2 " + focusRing.split(" ")[1] : ""}`}
      >
        <span className={`block truncate ${!selectedOption ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-white font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          {options.length > 5 && (
            <div className="p-2 border-b border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 bg-zinc-200/50 dark:bg-black/40 border border-transparent dark:border-white/5 rounded-xl text-zinc-900 dark:text-white text-sm outline-none focus:border-zinc-300 dark:focus:border-zinc-500 transition-colors placeholder-zinc-500"
                autoFocus
              />
            </div>
          )}
          <ul className="max-h-60 overflow-y-auto py-2">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-zinc-500 text-sm text-center">No se encontraron resultados</li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    value === option.value
                      ? `bg-zinc-100 dark:bg-white/10 ${activeText} font-semibold`
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
