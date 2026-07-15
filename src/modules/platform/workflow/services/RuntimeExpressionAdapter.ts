export interface IRuntimeExpressionAdapter {
  validate(expression: string): { valid: boolean; error?: string };
}

export class RuntimeExpressionAdapter implements IRuntimeExpressionAdapter {
  validate(expression: string): { valid: boolean; error?: string } {
    if (!expression || !expression.trim()) {
      return { valid: false, error: "Expression cannot be empty." };
    }

    try {
      // Validates expression syntax using runtime JavaScript expression parsing.
      // Execution is not performed here.
      // eslint-disable-next-line no-new-func
      new Function("context", `return (${expression});`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid expression.",
      };
    }
  }
}
