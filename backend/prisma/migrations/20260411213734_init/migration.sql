-- DropForeignKey
ALTER TABLE `Alternative` DROP FOREIGN KEY `Alternative_imageFileId_fkey`;

-- DropIndex
DROP INDEX `Alternative_imageFileId_idx` ON `Alternative`;

-- AddForeignKey
ALTER TABLE `Alternative` ADD CONSTRAINT `Alternative_imageFileId_fkey` FOREIGN KEY (`imageFileId`) REFERENCES `UploadedFile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
