import type { IAssignmentStrategyEngine } from "../contracts/IAssignmentStrategyEngine";
import type {
  AssignmentContext,
  AssignmentStrategyResult,
  ParticipantSet,
  ResolvedParticipant,
} from "../models/WorkflowModels";

function sortByPriority(participants: ResolvedParticipant[]): ResolvedParticipant[] {
  return [...participants].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): number {
  const value = hashSeed(seed);
  return value / 0xffffffff;
}

export class AssignmentStrategyEngine implements IAssignmentStrategyEngine {
  async resolveStrategy(context: AssignmentContext, participantSet: ParticipantSet): Promise<AssignmentStrategyResult> {
    const strategy = context.assignment.strategy ?? "SingleUser";
    const rankedParticipants = sortByPriority(participantSet.requiredParticipants);
    const strategySeed =
      context.assignment.strategySeed ??
      `${context.workflowVersionId}:${context.assignment.id}:${strategy}`;

    let selectedParticipants: ResolvedParticipant[] = [];

    switch (strategy) {
      case "AllUsers":
        selectedParticipants = rankedParticipants;
        break;
      case "Weighted": {
        if (rankedParticipants.length === 0) {
          selectedParticipants = [];
          break;
        }

        const weights = context.assignment.strategyWeights ?? {};
        const weighted = rankedParticipants.map((participant, index) => ({
          participant,
          weight: Math.max(0, weights[participant.participantId] ?? rankedParticipants.length - index),
        }));
        const total = weighted.reduce((sum, item) => sum + item.weight, 0);

        if (total <= 0) {
          selectedParticipants = rankedParticipants.slice(0, 1);
          break;
        }

        const random = seededRandom(strategySeed) * total;
        let cursor = 0;
        let picked = weighted[0].participant;
        for (const item of weighted) {
          cursor += item.weight;
          if (random <= cursor) {
            picked = item.participant;
            break;
          }
        }

        selectedParticipants = [picked];
        break;
      }
      case "Random": {
        if (rankedParticipants.length === 0) {
          selectedParticipants = [];
          break;
        }

        const randomIndex = Math.floor(seededRandom(strategySeed) * rankedParticipants.length);
        selectedParticipants = [rankedParticipants[randomIndex]];
        break;
      }
      case "AnyUser":
      case "RoundRobin":
      case "LeastLoaded":
      case "Manager":
      case "Hierarchy":
      case "Expression":
      case "Weighted":
      case "Priority":
      case "Random":
      case "Custom":
      case "SingleUser":
      default:
        selectedParticipants = rankedParticipants.slice(0, 1);
        break;
    }

    return {
      assignmentId: context.assignment.id,
      strategy,
      rankedParticipants,
      selectedParticipants,
      strategySeed,
      diagnostics: {
        strategy,
        strategySeed,
        selectedCount: selectedParticipants.length,
        participantCount: rankedParticipants.length,
      },
    };
  }
}
