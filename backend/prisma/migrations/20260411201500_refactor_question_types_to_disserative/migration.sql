-- Normalize old question type before enum change
UPDATE `Question`
SET `type` = 'MULTIPLE_CHOICE'
WHERE `type` = 'TRUE_FALSE';

-- AlterTable
ALTER TABLE `Question`
ADD COLUMN `answerText` LONGTEXT NULL,
ADD COLUMN `answerSpaceSize` ENUM('SMALL', 'MEDIUM', 'LARGE') NULL,
MODIFY `type` ENUM('MULTIPLE_CHOICE', 'DISSERTATIVE') NOT NULL;
