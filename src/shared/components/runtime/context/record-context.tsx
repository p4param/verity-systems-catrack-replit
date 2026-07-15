import React, { createContext } from "react";
import { RecordContext } from "./runtime-context.types";

export const RecordContextInstance = createContext<RecordContext | null>(null);

export interface RecordContextProviderProps {
  value: RecordContext;
  children: React.ReactNode;
}

export const RecordContextProvider: React.FC<RecordContextProviderProps> = ({
  value,
  children,
}) => {
  return (
    <RecordContextInstance.Provider value={value}>
      {children}
    </RecordContextInstance.Provider>
  );
};
