export class ExamVersionEntity {
  id: string;
  name: string;
  examId: string;
  orderData: any;
  pdfUrl?: string;
  answerKeyJson?: any;
  answerKeyUrl?: string;
  createdAt: Date;
}
