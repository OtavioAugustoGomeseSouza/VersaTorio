-- AlterTable
ALTER TABLE `ExamVersion`
  ADD COLUMN `answerKeyJson` JSON NULL,
  ADD COLUMN `answerKeyUrl` VARCHAR(191) NULL;
