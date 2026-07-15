import { useContext } from "react";
import { RecordContextInstance } from "./record-context";
import { RecordContext } from "./runtime-context.types";

export function useRecordContext(): RecordContext {
  const context = useContext(RecordContextInstance);
  if (!context) {
    throw new Error("useRecordContext must be used within a RecordContextProvider");
  }
  return context;
}
