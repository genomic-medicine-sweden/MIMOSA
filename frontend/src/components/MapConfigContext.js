"use client";
import { createContext, useContext } from "react";

export const MapConfigContext = createContext(null);

export function useMapConfigContext() {
  return useContext(MapConfigContext);
}
