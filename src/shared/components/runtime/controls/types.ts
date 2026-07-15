import { RuntimeContext, RecordContext } from "../context/runtime-context.types";
import { 
  EntityFieldDefinition, 
  LayoutFieldPlacement, 
  RuntimeAppearance, 
  RuntimePermissions, 
  RuntimeMode,
  RuntimeControlState
} from "../types/framework";

export interface RuntimeControlProps {
  field: EntityFieldDefinition;
  fieldMetadata: Record<string, unknown>;
  layoutMetadata: LayoutFieldPlacement;
  appearance: RuntimeAppearance;
  permissions: RuntimePermissions;
  runtimeContext: RuntimeContext;
  recordContext: RecordContext;
  value: any;
  displayValue?: string;
  onChange: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  mode: RuntimeMode;
  readonly?: boolean;
  disabled?: boolean;
  required?: boolean;
  controlState?: RuntimeControlState;
}
