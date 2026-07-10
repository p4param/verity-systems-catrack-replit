import { PrismaClient } from "@/generated/client";
import { RuntimeManifest } from "./manifest-generator";

export class NumberGeneratorService {
  /**
   * Generates a record number for the entity.
   * This is a temporary abstraction before CM-013 (Number Series).
   * It is intentionally isolated so the Runtime UI Generation architecture does not change
   * when the full Number Series module is implemented.
   */
  async generateRecordNumber(manifest: RuntimeManifest, tx: any): Promise<string> {
    const prefix = manifest.entity.substring(0, 3).toUpperCase();
    
    const lastRecord = await tx.entityRecord.findFirst({
      where: { recordNumber: { startsWith: `${prefix}-` } },
      orderBy: { createdAt: 'desc' }
    });

    let nextNum = 1;
    if (lastRecord) {
      const parts = lastRecord.recordNumber.split('-');
      if (parts.length === 2) {
        const parsed = parseInt(parts[1], 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }
    }

    return `${prefix}-${nextNum.toString().padStart(6, '0')}`;
  }
}

export const numberGeneratorService = new NumberGeneratorService();
