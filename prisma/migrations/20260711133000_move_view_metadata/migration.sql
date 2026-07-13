/*
  Warnings:

  - You are about to drop the column `columns` on the `EntityView` table. All the data in the column will be lost.
  - You are about to drop the column `filters` on the `EntityView` table. All the data in the column will be lost.
  - You are about to drop the column `sorting` on the `EntityView` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EntityView" DROP COLUMN "columns",
DROP COLUMN "filters",
DROP COLUMN "sorting";
