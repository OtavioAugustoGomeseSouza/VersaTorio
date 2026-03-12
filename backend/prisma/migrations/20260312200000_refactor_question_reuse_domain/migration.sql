-- CreateTable
CREATE TABLE `Topic` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `disciplineId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Topic_disciplineId_name_key`(`disciplineId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `examId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `position` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ExamQuestion_examId_questionId_key`(`examId`, `questionId`),
    INDEX `ExamQuestion_questionId_idx`(`questionId`),
    INDEX `ExamQuestion_examId_position_idx`(`examId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Question` ADD COLUMN `topicId` VARCHAR(191) NULL;

-- Seed a default legacy topic per discipline
INSERT INTO `Topic` (`id`, `name`, `disciplineId`, `createdAt`, `updatedAt`)
SELECT UUID(), 'Topico legado', s.`id`, NOW(3), NOW(3)
FROM `Subject` s;

-- Migrate question ownership to topic via exam -> discipline
UPDATE `Question` q
JOIN `Exam` e ON e.`id` = q.`examId`
JOIN `Topic` t ON t.`disciplineId` = e.`subjectId` AND t.`name` = 'Topico legado'
SET q.`topicId` = t.`id`
WHERE q.`examId` IS NOT NULL;

-- Fallback for legacy orphan questions that had no exam
SET @legacy_user_id := (
  SELECT `id` FROM `User` ORDER BY `createdAt` ASC LIMIT 1
);

INSERT INTO `Subject` (`id`, `name`, `userId`, `createdAt`, `updatedAt`)
SELECT UUID(), 'Disciplina legada sem prova', @legacy_user_id, NOW(3), NOW(3)
FROM DUAL
WHERE @legacy_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `Subject` s
    WHERE s.`userId` = @legacy_user_id
      AND s.`name` = 'Disciplina legada sem prova'
  );

INSERT INTO `Topic` (`id`, `name`, `disciplineId`, `createdAt`, `updatedAt`)
SELECT UUID(), 'Topico legado sem prova', s.`id`, NOW(3), NOW(3)
FROM `Subject` s
WHERE s.`userId` = @legacy_user_id
  AND s.`name` = 'Disciplina legada sem prova'
  AND NOT EXISTS (
    SELECT 1
    FROM `Topic` t
    WHERE t.`disciplineId` = s.`id`
      AND t.`name` = 'Topico legado sem prova'
  );

UPDATE `Question` q
JOIN `Subject` s ON s.`userId` = @legacy_user_id
  AND s.`name` = 'Disciplina legada sem prova'
JOIN `Topic` t ON t.`disciplineId` = s.`id`
  AND t.`name` = 'Topico legado sem prova'
SET q.`topicId` = t.`id`
WHERE q.`examId` IS NULL
  AND q.`topicId` IS NULL;

-- Materialize direct exam-question links to pivot table
INSERT INTO `ExamQuestion` (`id`, `examId`, `questionId`, `position`, `createdAt`)
SELECT UUID(), q.`examId`, q.`id`, NULL, NOW(3)
FROM `Question` q
WHERE q.`examId` IS NOT NULL;

-- Add new foreign keys
ALTER TABLE `Topic`
ADD CONSTRAINT `Topic_disciplineId_fkey`
FOREIGN KEY (`disciplineId`) REFERENCES `Subject`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ExamQuestion`
ADD CONSTRAINT `ExamQuestion_examId_fkey`
FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ExamQuestion`
ADD CONSTRAINT `ExamQuestion_questionId_fkey`
FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Question`
ADD CONSTRAINT `Question_topicId_fkey`
FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove old relation Question -> Exam
ALTER TABLE `Question` DROP FOREIGN KEY `Question_examId_fkey`;
ALTER TABLE `Question` MODIFY `topicId` VARCHAR(191) NOT NULL;
ALTER TABLE `Question` DROP COLUMN `examId`;
