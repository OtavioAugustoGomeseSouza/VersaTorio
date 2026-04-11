export class UploadedFileEntity {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  contentUrl: string;
}
