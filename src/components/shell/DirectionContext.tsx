"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Direction = "ltr" | "rtl";

interface DirectionContextValue {
  dir: Direction;
  toggleDirection: () => void;
  setDirection: (next: Direction) => void;
}

const DirectionContext = createContext<DirectionContextValue>({
  dir: "ltr",
  toggleDirection: () => {},
  setDirection: () => {},
});

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const [dir, setDir] = useState<Direction>("ltr");

  useEffect(() => {
    const saved = window.localStorage.getItem("along_dir");
    if (saved === "rtl" || saved === "ltr") {
      setDir(saved);
      document.documentElement.dir = saved;
      document.documentElement.lang = saved === "rtl" ? "ar" : "en";
    }
  }, []);

  function setDirection(next: Direction) {
    setDir(next);
    window.localStorage.setItem("along_dir", next);
    document.documentElement.dir = next;
    document.documentElement.lang = next === "rtl" ? "ar" : "en";
  }

  function toggleDirection() {
    setDirection(dir === "ltr" ? "rtl" : "ltr");
  }

  return (
    <DirectionContext.Provider value={{ dir, toggleDirection, setDirection }}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection() {
  return useContext(DirectionContext);
}
