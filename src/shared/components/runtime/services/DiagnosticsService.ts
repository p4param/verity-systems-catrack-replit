export class RuntimeDiagnosticsService {
  private enabled: boolean = false;
  private changeListeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("cap_diagnostics_enabled") === "true";
      this.setupGlobalListener();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("cap_diagnostics_enabled", String(enabled));
    }
    this.changeListeners.forEach((l) => l(enabled));
  }

  subscribe(listener: (enabled: boolean) => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  private setupGlobalListener() {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "D") {
        e.preventDefault();
        this.setEnabled(!this.enabled);
      }
    });
  }
}

export const diagnosticsService = new RuntimeDiagnosticsService();
export default diagnosticsService;
