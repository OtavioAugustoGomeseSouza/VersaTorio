export class ExamVersionEntity {
  id: string;
  name: string;
  examId: string;
  orderData: any;
  pdfUrl?: string;
  createdAt: Date;
}
