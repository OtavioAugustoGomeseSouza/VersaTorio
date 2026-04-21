import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedFilesService } from '../uploaded-files/uploaded-files.service';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';

describe('QuestionsService', () => {
  let service: QuestionsService;

  const prismaMock = {
    question: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    examVersion: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const uploadedFilesServiceMock = {
    remove: jest.fn(),
  };

  const authUser: AuthTokenPayload = {
    id: 'user-1',
    email: 'professor@example.com',
    role: UserRole.user,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: UploadedFilesService,
          useValue: uploadedFilesServiceMock,
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('removes the question from exam versions and cleans up linked files', async () => {
    prismaMock.question.findUnique.mockResolvedValue({
      id: 'question-1',
      text: 'Pergunta',
      type: 'MULTIPLE_CHOICE',
      topicId: 'topic-1',
      topic: {
        discipline: {
          userId: authUser.id,
        },
      },
      alternatives: [
        {
          id: 'alternative-1',
          imageFileId: 'alt-image-1',
        },
      ],
      questionImages: [
        {
          id: 'question-image-1',
          fileId: 'question-image-file-1',
          position: 1,
        },
      ],
      examQuestions: [
        {
          exam: {
            versions: [
              {
                id: 'version-1',
                orderData: {
                  questions: [
                    {
                      questionId: 'question-1',
                      position: 1,
                      alternatives: [
                        {
                          alternativeId: 'alternative-1',
                          position: 1,
                        },
                      ],
                    },
                    {
                      questionId: 'question-2',
                      position: 2,
                      alternatives: [
                        {
                          alternativeId: 'alternative-2',
                          position: 1,
                        },
                      ],
                    },
                  ],
                },
                answerKeyJson: {
                  version: 'Versao A',
                  answers: [
                    {
                      questionNumber: 1,
                      questionId: 'question-1',
                      correctOptions: ['A'],
                    },
                    {
                      questionNumber: 2,
                      questionId: 'question-2',
                      correctOptions: ['B'],
                    },
                  ],
                },
                pdfUrl: '/uploaded-files/pdf-file-1/content',
                answerKeyUrl: '/uploaded-files/answer-file-1/content',
              },
            ],
          },
        },
      ],
    });

    prismaMock.question.delete.mockResolvedValue({
      id: 'question-1',
      text: 'Pergunta',
      type: 'MULTIPLE_CHOICE',
      topicId: 'topic-1',
      alternatives: [],
      questionImages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    uploadedFilesServiceMock.remove.mockResolvedValue(undefined);

    await service.remove('question-1', authUser);

    expect(prismaMock.examVersion.update).toHaveBeenCalledWith({
      where: { id: 'version-1' },
      data: {
        orderData: {
          questions: [
            {
              questionId: 'question-2',
              position: 1,
              alternatives: [
                {
                  alternativeId: 'alternative-2',
                  position: 1,
                },
              ],
            },
          ],
        } as unknown as Prisma.InputJsonValue,
        answerKeyJson: {
          version: 'Versao A',
          answers: [
            {
              questionNumber: 1,
              questionId: 'question-2',
              correctOptions: ['B'],
            },
          ],
        } as Prisma.InputJsonValue,
        pdfUrl: null,
        answerKeyUrl: null,
      },
    });

    expect(prismaMock.question.delete).toHaveBeenCalledWith({
      where: { id: 'question-1' },
      include: {
        alternatives: true,
        questionImages: {
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
            questionId: true,
            fileId: true,
            position: true,
            createdAt: true,
          },
        },
      },
    });

    expect(uploadedFilesServiceMock.remove).toHaveBeenCalledTimes(4);
    expect(uploadedFilesServiceMock.remove).toHaveBeenCalledWith(
      'question-image-file-1',
      authUser,
    );
    expect(uploadedFilesServiceMock.remove).toHaveBeenCalledWith(
      'alt-image-1',
      authUser,
    );
    expect(uploadedFilesServiceMock.remove).toHaveBeenCalledWith(
      'pdf-file-1',
      authUser,
    );
    expect(uploadedFilesServiceMock.remove).toHaveBeenCalledWith(
      'answer-file-1',
      authUser,
    );
  });
});
