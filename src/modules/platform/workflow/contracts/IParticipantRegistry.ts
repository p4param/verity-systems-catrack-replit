import type { IParticipantProvider } from "./IParticipantProvider";
import type { WorkflowParticipantType } from "../models/WorkflowModels";

export interface IParticipantRegistry {
  register(provider: IParticipantProvider): void;
  get(participantType: WorkflowParticipantType): IParticipantProvider | null;
  getAll(): readonly IParticipantProvider[];
}
