/*
  Warnings:

  - You are about to alter the column `originalName` on the `UploadedFile` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `storageKey` on the `UploadedFile` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `UploadedFile` MODIFY `originalName` VARCHAR(191) NOT NULL,
    MODIFY `storageKey` VARCHAR(191) NOT NULL;
