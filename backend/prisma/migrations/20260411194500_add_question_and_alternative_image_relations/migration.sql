-- AlterTable
ALTER TABLE `Alternative`
ADD COLUMN `imageFileId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `QuestionImage` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `QuestionImage_questionId_fileId_key`(`questionId`, `fileId`),
    INDEX `QuestionImage_questionId_idx`(`questionId`),
    INDEX `QuestionImage_fileId_idx`(`fileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Alternative_imageFileId_idx` ON `Alternative`(`imageFileId`);

-- AddForeignKey
ALTER TABLE `Alternative`
ADD CONSTRAINT `Alternative_imageFileId_fkey`
FOREIGN KEY (`imageFileId`) REFERENCES `UploadedFile`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestionImage`
ADD CONSTRAINT `QuestionImage_questionId_fkey`
FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestionImage`
ADD CONSTRAINT `QuestionImage_fileId_fkey`
FOREIGN KEY (`fileId`) REFERENCES `UploadedFile`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;
