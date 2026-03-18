ALTER TABLE `ExamQuestion`
DROP INDEX `ExamQuestion_examId_position_idx`;

ALTER TABLE `ExamQuestion`
DROP COLUMN `position`;
