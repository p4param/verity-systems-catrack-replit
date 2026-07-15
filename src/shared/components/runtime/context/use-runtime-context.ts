import { useContext } from "react";
import { RuntimeContextInstance } from "./runtime-context";
import { RuntimeContext } from "./runtime-context.types";

export function useRuntimeContext(): RuntimeContext {
  const context = useContext(RuntimeContextInstance);
  if (!context) {
    throw new Error("useRuntimeContext must be used within a RuntimeContextProvider");
  }
  return context;
}
