import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnswerSpaceSize,
  AlternativeType,
  Prisma,
  QuestionType,
} from '@prisma/client';
import { readFile } from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';
import { GenerateExamVersionPdfDto } from './dto/generate-exam-version-pdf.dto';
import { UploadedFilesService } from '../uploaded-files/uploaded-files.service';
import { getExamPdfConfig } from './exam-pdf.config';

type PdfDocumentNode = Record<string, unknown>;
type PdfMake = {
  addFonts(fonts: Record<string, unknown>): void;
  setUrlAccessPolicy(callback: (url: string) => boolean): void;
  createPdf(docDefinition: Record<string, unknown>): {
    getBuffer(): Promise<Buffer>;
  };
};

const pdfMake = require('pdfmake') as PdfMake;
let isPdfMakeConfigured = false;

type ExamVersionOrderData = {
  questions: Array<{
    questionId: string;
    position: number;
    alternatives: Array<{
      alternativeId: string;
      position: number;
    }>;
  }>;
};
type AccessibleExam = Awaited<
  ReturnType<ExamVersionsService['getAccessibleExam']>
>;
type AccessibleExamVersionForPdf = Awaited<
  ReturnType<ExamVersionsService['getAccessibleExamVersionForPdf']>
>;
type ExamQuestionForPdf =
  AccessibleExamVersionForPdf['exam']['examQuestions'][number]['question'];
type ExamAlternativeForPdf = ExamQuestionForPdf['alternatives'][number];
type OrderedQuestion = ExamVersionOrderData['questions'][number];
type AnswerKeyJson = {
  version: string;
  exam: string;
  discipline: string | null;
  answers: Array<{
    questionNumber: number;
    questionId: string;
    type: QuestionType;
    correctOptions?: string[];
    alternatives?: Array<{
      option: string;
      alternativeId: string;
      isCorrect: boolean;
    }>;
    expectedAnswer?: string;
  }>;
};

@Injectable()
export class ExamVersionsService {
  private readonly pdfConfig = getExamPdfConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadedFilesService: UploadedFilesService,
  ) {
    this.configurePdfMake();
  }

  private configurePdfMake(): void {
    if (isPdfMakeConfigured) {
      return;
    }

    pdfMake.addFonts({
      Roboto: {
        normal: require.resolve('pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
        bold: require.resolve('pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
        italics: require.resolve('pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
        bolditalics:
          require.resolve('pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
      },
    });
    pdfMake.setUrlAccessPolicy(() => false);
    isPdfMakeConfigured = true;
  }

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  private async getAccessibleExam(examId: string, authUser: AuthTokenPayload) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          orderBy: [{ createdAt: 'asc' }],
          include: {
            question: {
              select: {
                id: true,
                type: true,
                answerText: true,
                answerSpaceSize: true,
                alternatives: true,
                topic: {
                  select: { disciplineId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!exam || (!this.isAdmin(authUser) && exam.userId !== authUser.id)) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  private async getAccessibleExamVersionForPdf(
    id: string,
    authUser: AuthTokenPayload,
  ) {
    const examVersion = await this.prisma.examVersion.findUnique({
      where: { id },
      include: {
        exam: {
          include: {
            discipline: {
              select: {
                id: true,
                name: true,
              },
            },
            examQuestions: {
              include: {
                question: {
                  include: {
                    alternatives: {
                      orderBy: [{ createdAt: 'asc' }],
                    },
                    questionImages: {
                      orderBy: [{ position: 'asc' }],
                    },
                    topic: {
                      select: {
                        name: true,
                        discipline: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !examVersion ||
      (!this.isAdmin(authUser) && examVersion.exam.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Exam version with ID ${id} not found`);
    }

    return examVersion;
  }

  private validateExamQuestionsForGeneration(exam: AccessibleExam): void {
    if (exam.examQuestions.length === 0) {
      throw new BadRequestException(
        'Cannot generate exam version without questions',
      );
    }

    for (const examQuestion of exam.examQuestions) {
      const question = examQuestion.question;

      const totalAlternatives = question.alternatives.length;
      const correctAlternatives = question.alternatives.filter(
        (alternative) => alternative.isCorrect,
      ).length;

      if (question.type === QuestionType.DISSERTATIVE) {
        if (!question.answerText || !question.answerSpaceSize) {
          throw new BadRequestException(
            `Question ${question.id} must include answerText and answerSpaceSize for DISSERTATIVE`,
          );
        }

        if (totalAlternatives > 0) {
          throw new BadRequestException(
            `Question ${question.id} cannot have alternatives for DISSERTATIVE`,
          );
        }

        continue;
      }

      if (totalAlternatives < 2) {
        throw new BadRequestException(
          `Question ${question.id} must have at least 2 alternatives`,
        );
      }

      if (correctAlternatives < 1) {
        throw new BadRequestException(
          `Question ${question.id} must have at least 1 correct alternative`,
        );
      }
    }
  }

  async generate(
    examId: string,
    name: string,
    shuffleQuestionsOverride: boolean | undefined,
    shuffleAlternativesOverride: boolean | undefined,
    authUser: AuthTokenPayload,
  ) {
    const exam = await this.getAccessibleExam(examId, authUser);
    this.validateExamQuestionsForGeneration(exam);

    const shouldShuffleQuestions =
      shuffleQuestionsOverride ?? exam.shuffleQuestions;
    const shouldShuffleAlternatives =
      shuffleAlternativesOverride ?? exam.shuffleAlternatives;

    const orderedQuestions = this.shuffleQuestions(
      exam.examQuestions.map((examQuestion) => examQuestion.question),
      shouldShuffleQuestions,
    );

    const orderData: ExamVersionOrderData = {
      questions: orderedQuestions.map((question, questionIndex) => ({
        questionId: question.id,
        position: questionIndex + 1,
        alternatives: this.shuffleAlternatives(
          [...question.alternatives],
          shouldShuffleAlternatives,
        ).map((alternative, alternativeIndex) => ({
          alternativeId: alternative.id,
          position: alternativeIndex + 1,
        })),
      })),
    };

    return this.prisma.examVersion.create({
      data: {
        name,
        examId,
        orderData,
      },
    });
  }

  private shuffleQuestions<T>(questions: T[], shouldShuffle: boolean): T[] {
    if (!shouldShuffle) {
      return [...questions];
    }

    return this.shuffleArray(questions);
  }

  private shuffleAlternatives<T>(
    alternatives: T[],
    shouldShuffle: boolean,
  ): T[] {
    if (!shouldShuffle) {
      return [...alternatives];
    }

    return this.shuffleArray(alternatives);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  private parseOrderData(orderData: Prisma.JsonValue): ExamVersionOrderData {
    if (
      !orderData ||
      typeof orderData !== 'object' ||
      Array.isArray(orderData) ||
      !Array.isArray((orderData as { questions?: unknown }).questions)
    ) {
      throw new BadRequestException('Exam version orderData is invalid');
    }

    const questions = (orderData as { questions: unknown[] }).questions.map(
      (question) => {
        if (
          !question ||
          typeof question !== 'object' ||
          Array.isArray(question)
        ) {
          throw new BadRequestException(
            'Exam version question order is invalid',
          );
        }

        const parsedQuestion = question as {
          questionId?: unknown;
          position?: unknown;
          alternatives?: unknown;
        };

        if (
          typeof parsedQuestion.questionId !== 'string' ||
          typeof parsedQuestion.position !== 'number' ||
          !Array.isArray(parsedQuestion.alternatives)
        ) {
          throw new BadRequestException(
            'Exam version question order is invalid',
          );
        }

        const alternatives = parsedQuestion.alternatives.map((alternative) => {
          if (
            !alternative ||
            typeof alternative !== 'object' ||
            Array.isArray(alternative)
          ) {
            throw new BadRequestException(
              'Exam version alternative order is invalid',
            );
          }

          const parsedAlternative = alternative as {
            alternativeId?: unknown;
            position?: unknown;
          };

          if (
            typeof parsedAlternative.alternativeId !== 'string' ||
            typeof parsedAlternative.position !== 'number'
          ) {
            throw new BadRequestException(
              'Exam version alternative order is invalid',
            );
          }

          return {
            alternativeId: parsedAlternative.alternativeId,
            position: parsedAlternative.position,
          };
        });

        return {
          questionId: parsedQuestion.questionId,
          position: parsedQuestion.position,
          alternatives,
        };
      },
    );

    return {
      questions: questions.sort(
        (first, second) => first.position - second.position,
      ),
    };
  }

  private buildQuestionMap(
    examVersion: AccessibleExamVersionForPdf,
  ): Map<string, ExamQuestionForPdf> {
    return new Map(
      examVersion.exam.examQuestions.map((examQuestion) => [
        examQuestion.question.id,
        examQuestion.question,
      ]),
    );
  }

  private buildHeaderTable(
    generatePdfDto: GenerateExamVersionPdfDto,
  ): PdfDocumentNode {
    const fields = generatePdfDto.headerFields.map((field) => ({
      label: field.label.trim(),
      value: field.value?.trim() ?? '',
    }));

    const rows: PdfDocumentNode[][] = [];
    for (let index = 0; index < fields.length; index += 2) {
      const rowFields = fields.slice(index, index + 2);
      rows.push(
        [0, 1].map((rowIndex) => {
          const field = rowFields[rowIndex];

          if (!field) {
            return { text: '', border: [false, false, false, false] };
          }

          return {
            text: [
              { text: `${field.label}: `, bold: true },
              field.value,
            ],
            margin: [6, 6, 6, 6],
          };
        }),
      );
    }

    return {
      table: {
        widths: ['*', '*'],
        body: rows,
      },
      layout: {
        hLineColor: () => this.pdfConfig.borderColor,
        vLineColor: () => this.pdfConfig.borderColor,
      },
      margin: [0, 0, 0, 12],
    };
  }

  private buildExamHeaderContent(examVersion: AccessibleExamVersionForPdf): {
    title: string;
    subtitle: string;
  } {
    return {
      title: examVersion.exam.discipline?.name?.trim() || 'Disciplina sem nome',
      subtitle: examVersion.exam.name,
    };
  }

  private async loadPdfImage(
    fileId: string,
    authUser: AuthTokenPayload,
  ): Promise<string | null> {
    let content: Awaited<ReturnType<UploadedFilesService['getContentData']>>;

    try {
      content = await this.uploadedFilesService.getContentData(
        fileId,
        authUser,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }

    if (!['image/png', 'image/jpeg'].includes(content.mimeType)) {
      return null;
    }

    try {
      const imageBuffer = await readFile(content.absolutePath);
      return `data:${content.mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  private buildAlternativeMap(
    alternatives: ExamAlternativeForPdf[],
  ): Map<string, ExamAlternativeForPdf> {
    return new Map(
      alternatives.map((alternative) => [alternative.id, alternative]),
    );
  }

  private getOrderedAlternatives(
    question: ExamQuestionForPdf,
    orderedQuestion: OrderedQuestion,
  ): ExamAlternativeForPdf[] {
    const alternativeMap = this.buildAlternativeMap(question.alternatives);

    return [...orderedQuestion.alternatives]
      .sort((first, second) => first.position - second.position)
      .map((alternativeOrder) =>
        alternativeMap.get(alternativeOrder.alternativeId),
      )
      .filter((alternative): alternative is ExamAlternativeForPdf =>
        Boolean(alternative),
      );
  }

  private buildAnswerSpace(
    answerSpaceSize: AnswerSpaceSize | null,
  ): PdfDocumentNode {
    return {
      table: {
        widths: ['*'],
        heights: [
          this.pdfConfig.answerSpaceHeights[
            answerSpaceSize ?? AnswerSpaceSize.MEDIUM
          ],
        ],
        body: [[{ text: '' }]],
      },
      layout: {
        hLineColor: () => this.pdfConfig.answerSpaceBorderColor,
        vLineColor: () => this.pdfConfig.answerSpaceBorderColor,
      },
      margin: [0, 8, 0, 0],
    };
  }

  private async buildAlternativeNode(
    alternative: ExamAlternativeForPdf,
    index: number,
    columns: 1 | 2,
    authUser: AuthTokenPayload,
  ): Promise<PdfDocumentNode> {
    const optionLetter = String.fromCharCode(65 + index);
    const content: PdfDocumentNode[] = [];

    if (alternative.type === AlternativeType.IMAGE && alternative.imageFileId) {
      const imageData = await this.loadPdfImage(
        alternative.imageFileId,
        authUser,
      );

      if (imageData) {
        content.push({
          image: imageData,
          fit: columns === 2 ? [150, 90] : [260, 130],
          margin: [0, 2, 0, 2],
        });
      } else {
        content.push({
          text: 'Imagem não incluída no PDF.',
          italics: true,
          color: this.pdfConfig.imageFallbackColor,
        });
      }
    }

    if (alternative.text) {
      content.unshift({
        text: alternative.text,
      });
    }

    return {
      columns: [
        { text: `${optionLetter}.`, width: 18, bold: true },
        { stack: content.length > 0 ? content : [{ text: '-' }], width: '*' },
      ],
      columnGap: 4,
      margin: [0, 3, 0, 0],
    };
  }

  private async buildQuestionNode(
    question: ExamQuestionForPdf,
    orderedQuestion: OrderedQuestion,
    index: number,
    columns: 1 | 2,
    authUser: AuthTokenPayload,
  ): Promise<PdfDocumentNode> {
    const stack: PdfDocumentNode[] = [
      {
        text: [{ text: `${index}. `, bold: true }, { text: question.text }],
        style: 'questionText',
      },
    ];

    for (const questionImage of question.questionImages) {
      const imageData = await this.loadPdfImage(questionImage.fileId, authUser);

      stack.push(
        imageData
          ? {
              image: imageData,
              fit: columns === 2 ? [210, 120] : [480, 220],
              margin: [0, 6, 0, 4],
            }
          : {
              text: 'Imagem da questão não incluída no PDF.',
              italics: true,
              color: this.pdfConfig.imageFallbackColor,
              margin: [0, 4, 0, 2],
            },
      );
    }

    if (question.type === QuestionType.DISSERTATIVE) {
      stack.push(this.buildAnswerSpace(question.answerSpaceSize));
    } else {
      const orderedAlternatives = this.getOrderedAlternatives(
        question,
        orderedQuestion,
      );

      for (
        let alternativeIndex = 0;
        alternativeIndex < orderedAlternatives.length;
        alternativeIndex += 1
      ) {
        stack.push(
          await this.buildAlternativeNode(
            orderedAlternatives[alternativeIndex],
            alternativeIndex,
            columns,
            authUser,
          ),
        );
      }
    }

    return {
      stack,
      margin: [0, 0, 0, 10],
    };
  }

  private buildQuestionsContent(
    questionNodes: PdfDocumentNode[],
    columns: 1 | 2,
  ): PdfDocumentNode {
    if (columns === 1) {
      return { stack: questionNodes };
    }

    return {
      columns: [
        { stack: questionNodes, width: '*' },
        { text: '', width: '*' },
      ],
      columnGap: 18,
      snakingColumns: true,
    };
  }

  private async buildPdfDefinition(
    examVersion: AccessibleExamVersionForPdf,
    generatePdfDto: GenerateExamVersionPdfDto,
    authUser: AuthTokenPayload,
  ): Promise<Record<string, unknown>> {
    const headerContent = this.buildExamHeaderContent(examVersion);
    const orderData = this.parseOrderData(examVersion.orderData);
    const questionMap = this.buildQuestionMap(examVersion);
    const questionNodes: PdfDocumentNode[] = [];

    for (let index = 0; index < orderData.questions.length; index += 1) {
      const orderedQuestion = orderData.questions[index];
      const question = questionMap.get(orderedQuestion.questionId);

      if (!question) {
        throw new BadRequestException(
          `Question ${orderedQuestion.questionId} is not linked to this exam`,
        );
      }

      questionNodes.push(
        await this.buildQuestionNode(
          question,
          orderedQuestion,
          index + 1,
          generatePdfDto.columns,
          authUser,
        ),
      );
    }

    return {
      pageSize: this.pdfConfig.pageSize,
      pageMargins: [36, 40, 36, 48],
      defaultStyle: {
        font: 'Roboto',
        fontSize: this.pdfConfig.baseFontSize,
        lineHeight: 1.15,
        color: this.pdfConfig.textColor,
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: generatePdfDto.includeVersionInFooter
              ? 'left'
              : 'center',
          },
          ...(generatePdfDto.includeVersionInFooter
            ? [
                {
                  text: examVersion.name,
                  alignment: 'right',
                  fontSize: 7,
                  color: this.pdfConfig.mutedColor,
                },
              ]
            : []),
        ],
        margin: [36, 0, 36, 18],
        fontSize: 8,
        color: this.pdfConfig.mutedColor,
      }),
      content: [
        {
          text: headerContent.title,
          style: 'examTitle',
        },
        {
          text: headerContent.subtitle,
          style: 'examSubtitle',
        },
        this.buildHeaderTable(generatePdfDto),
        this.buildQuestionsContent(questionNodes, generatePdfDto.columns),
      ],
      styles: {
        examTitle: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 3],
        },
        examSubtitle: {
          fontSize: 9,
          color: this.pdfConfig.subtleTextColor,
          margin: [0, 0, 0, 10],
        },
        questionText: {
          fontSize: this.pdfConfig.baseFontSize,
          bold: false,
        },
      },
    };
  }

  private buildAnswerKeyJson(
    examVersion: AccessibleExamVersionForPdf,
  ): AnswerKeyJson {
    const orderData = this.parseOrderData(examVersion.orderData);
    const questionMap = this.buildQuestionMap(examVersion);

    return {
      version: examVersion.name,
      exam: examVersion.exam.name,
      discipline: examVersion.exam.discipline?.name ?? null,
      answers: orderData.questions.map((orderedQuestion, index) => {
        const question = questionMap.get(orderedQuestion.questionId);

        if (!question) {
          throw new BadRequestException(
            `Question ${orderedQuestion.questionId} is not linked to this exam`,
          );
        }

        if (question.type === QuestionType.DISSERTATIVE) {
          return {
            questionNumber: index + 1,
            questionId: question.id,
            type: question.type,
            expectedAnswer: question.answerText ?? '',
          };
        }

        const orderedAlternatives = this.getOrderedAlternatives(
          question,
          orderedQuestion,
        );
        const alternatives = orderedAlternatives.map(
          (alternative, alternativeIndex) => ({
            option: String.fromCharCode(65 + alternativeIndex),
            alternativeId: alternative.id,
            isCorrect: alternative.isCorrect,
          }),
        );

        return {
          questionNumber: index + 1,
          questionId: question.id,
          type: question.type,
          correctOptions: alternatives
            .filter((alternative) => alternative.isCorrect)
            .map((alternative) => alternative.option),
          alternatives,
        };
      }),
    };
  }

  private async buildAnswerKeyAlternativeNode(
    alternative: ExamAlternativeForPdf,
    index: number,
    authUser: AuthTokenPayload,
  ): Promise<PdfDocumentNode> {
    const optionLetter = String.fromCharCode(65 + index);
    const isCorrect = alternative.isCorrect;
    const content: PdfDocumentNode[] = [];

    if (alternative.type === AlternativeType.IMAGE && alternative.imageFileId) {
      const imageData = await this.loadPdfImage(
        alternative.imageFileId,
        authUser,
      );

      if (imageData) {
        content.push({
          image: imageData,
          fit: [180, 95],
          margin: [0, 3, 0, 2],
        });
      } else {
        content.push({
          text: 'Imagem não incluída no PDF.',
          italics: true,
          color: this.pdfConfig.imageFallbackColor,
        });
      }
    }

    if (alternative.text) {
      content.unshift({ text: alternative.text });
    }

    return {
      columns: [
        {
          text: `${isCorrect ? '[X]' : '[ ]'} ${optionLetter}.`,
          width: 42,
          bold: true,
          color: isCorrect
            ? this.pdfConfig.accentColor
            : this.pdfConfig.mutedColor,
        },
        {
          stack: content.length > 0 ? content : [{ text: '-' }],
          width: '*',
          color: isCorrect
            ? this.pdfConfig.accentColor
            : this.pdfConfig.textColor,
          bold: isCorrect,
        },
      ],
      columnGap: 6,
      margin: [0, 3, 0, 0],
    };
  }

  private async buildAnswerKeyQuestionNode(
    question: ExamQuestionForPdf,
    orderedQuestion: OrderedQuestion,
    index: number,
    authUser: AuthTokenPayload,
  ): Promise<PdfDocumentNode> {
    const stack: PdfDocumentNode[] = [
      {
        text: [{ text: `${index}. `, bold: true }, { text: question.text }],
        style: 'questionText',
      },
    ];

    for (const questionImage of question.questionImages) {
      const imageData = await this.loadPdfImage(questionImage.fileId, authUser);

      stack.push(
        imageData
          ? {
              image: imageData,
              fit: [480, 210],
              margin: [0, 6, 0, 4],
            }
          : {
              text: 'Imagem da questão não incluída no PDF.',
              italics: true,
              color: this.pdfConfig.imageFallbackColor,
              margin: [0, 4, 0, 2],
            },
      );
    }

    if (question.type === QuestionType.DISSERTATIVE) {
      stack.push({
        text: [
          { text: 'Resposta esperada: ', bold: true },
          question.answerText ?? '-',
        ],
        margin: [0, 5, 0, 0],
      });
    } else {
      const orderedAlternatives = this.getOrderedAlternatives(
        question,
        orderedQuestion,
      );

      for (
        let alternativeIndex = 0;
        alternativeIndex < orderedAlternatives.length;
        alternativeIndex += 1
      ) {
        stack.push(
          await this.buildAnswerKeyAlternativeNode(
            orderedAlternatives[alternativeIndex],
            alternativeIndex,
            authUser,
          ),
        );
      }
    }

    return {
      stack,
      margin: [0, 0, 0, 12],
    };
  }

  private async buildAnswerKeyPdfDefinition(
    examVersion: AccessibleExamVersionForPdf,
    authUser: AuthTokenPayload,
  ): Promise<Record<string, unknown>> {
    const headerContent = this.buildExamHeaderContent(examVersion);
    const orderData = this.parseOrderData(examVersion.orderData);
    const questionMap = this.buildQuestionMap(examVersion);
    const questionNodes: PdfDocumentNode[] = [];

    for (let index = 0; index < orderData.questions.length; index += 1) {
      const orderedQuestion = orderData.questions[index];
      const question = questionMap.get(orderedQuestion.questionId);

      if (!question) {
        throw new BadRequestException(
          `Question ${orderedQuestion.questionId} is not linked to this exam`,
        );
      }

      questionNodes.push(
        await this.buildAnswerKeyQuestionNode(
          question,
          orderedQuestion,
          index + 1,
          authUser,
        ),
      );
    }

    return {
      pageSize: this.pdfConfig.pageSize,
      pageMargins: [36, 40, 36, 48],
      defaultStyle: {
        font: 'Roboto',
        fontSize: this.pdfConfig.baseFontSize,
        lineHeight: 1.15,
        color: this.pdfConfig.textColor,
      },
      footer: (currentPage: number, pageCount: number) => ({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        margin: [36, 0, 36, 18],
        fontSize: 8,
        color: this.pdfConfig.mutedColor,
      }),
      content: [
        {
          text: headerContent.title,
          style: 'examTitle',
        },
        {
          text: `Gabarito - ${headerContent.subtitle} | ${examVersion.name}`,
          style: 'examSubtitle',
        },
        {
          text: 'Alternativas corretas estão marcadas com [X].',
          margin: [0, 0, 0, 10],
          color: this.pdfConfig.mutedColor,
        },
        { stack: questionNodes },
      ],
      styles: {
        examTitle: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 3],
        },
        examSubtitle: {
          fontSize: 9,
          color: this.pdfConfig.subtleTextColor,
          margin: [0, 0, 0, 10],
        },
        questionText: {
          fontSize: this.pdfConfig.baseFontSize,
          bold: false,
        },
      },
    };
  }

  private buildPdfFileName(examVersion: AccessibleExamVersionForPdf): string {
    const safeExamName = examVersion.exam.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const safeVersionName = examVersion.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    return `${safeExamName || 'prova'}-${safeVersionName || 'versao'}.pdf`;
  }

  private buildAnswerKeyFileName(
    examVersion: AccessibleExamVersionForPdf,
  ): string {
    return this.buildPdfFileName(examVersion).replace(
      /\.pdf$/,
      '-gabarito.pdf',
    );
  }

  async generatePdf(
    id: string,
    generatePdfDto: GenerateExamVersionPdfDto,
    authUser: AuthTokenPayload,
  ) {
    const examVersion = await this.getAccessibleExamVersionForPdf(id, authUser);
    const docDefinition = await this.buildPdfDefinition(
      examVersion,
      generatePdfDto,
      authUser,
    );
    const pdfBuffer = await pdfMake.createPdf(docDefinition).getBuffer();
    const uploadedPdf = await this.uploadedFilesService.upload(
      {
        originalname: this.buildPdfFileName(examVersion),
        mimetype: 'application/pdf',
        size: pdfBuffer.length,
        buffer: pdfBuffer,
      },
      authUser,
    );

    return this.prisma.examVersion.update({
      where: { id: examVersion.id },
      data: {
        pdfUrl: uploadedPdf.contentUrl,
      },
    });
  }

  async generateAnswerKey(id: string, authUser: AuthTokenPayload) {
    const examVersion = await this.getAccessibleExamVersionForPdf(id, authUser);
    const answerKeyJson = this.buildAnswerKeyJson(examVersion);
    const docDefinition = await this.buildAnswerKeyPdfDefinition(
      examVersion,
      authUser,
    );
    const pdfBuffer = await pdfMake.createPdf(docDefinition).getBuffer();
    const uploadedAnswerKey = await this.uploadedFilesService.upload(
      {
        originalname: this.buildAnswerKeyFileName(examVersion),
        mimetype: 'application/pdf',
        size: pdfBuffer.length,
        buffer: pdfBuffer,
      },
      authUser,
    );

    return this.prisma.examVersion.update({
      where: { id: examVersion.id },
      data: {
        answerKeyJson: answerKeyJson as unknown as Prisma.InputJsonValue,
        answerKeyUrl: uploadedAnswerKey.contentUrl,
      },
    });
  }

  findAll(authUser: AuthTokenPayload) {
    return this.prisma.examVersion.findMany({
      where: this.isAdmin(authUser)
        ? undefined
        : {
            exam: {
              userId: authUser.id,
            },
          },
    });
  }

  async findOne(id: string, authUser: AuthTokenPayload) {
    const examVersion = await this.prisma.examVersion.findUnique({
      where: { id },
      include: { exam: true },
    });

    if (
      !examVersion ||
      (!this.isAdmin(authUser) && examVersion.exam.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Exam version with ID ${id} not found`);
    }

    return examVersion;
  }

  async remove(id: string, authUser: AuthTokenPayload) {
    await this.findOne(id, authUser);

    return this.prisma.examVersion.delete({
      where: { id },
    });
  }
}
