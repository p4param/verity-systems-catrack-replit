import React, { createContext } from "react";
import { RuntimeContext } from "./runtime-context.types";

export const RuntimeContextInstance = createContext<RuntimeContext | null>(null);

export interface RuntimeContextProviderProps {
  value: RuntimeContext;
  children: React.ReactNode;
}

export const RuntimeContextProvider: React.FC<RuntimeContextProviderProps> = ({
  value,
  children,
}) => {
  return (
    <RuntimeContextInstance.Provider value={value}>
      {children}
    </RuntimeContextInstance.Provider>
  );
};
