import {
  PrismaClient,
  Role,
  QuestionType,
  AlternativeType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Users
  console.log('Seeding users...');
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Regular User',
      password: userPassword,
      role: Role.USER,
    },
  });

  console.log('Seeding disciplines, topics, exams, questions and alternatives...');

  const regularUser = await prisma.user.findUniqueOrThrow({
    where: { email: 'user@example.com' },
  });

  const discipline = await prisma.discipline.create({
    data: {
      name: 'Algoritmos e Estruturas de Dados',
      userId: regularUser.id,
    },
  });

  const topic = await prisma.topic.create({
    data: {
      name: 'Arvores Binarias',
      disciplineId: discipline.id,
    },
  });

  const exam = await prisma.exam.create({
    data: {
      name: 'Prova 1',
      description: 'Versao base da prova',
      userId: regularUser.id,
      disciplineId: discipline.id,
    },
  });

  // Question 1: Multiple Choice
  const question1 = await prisma.question.create({
    data: {
      text: 'Qual destas linguagens é fortemente tipada?',
      type: QuestionType.MULTIPLE_CHOICE,
      topicId: topic.id,
      alternatives: {
        create: [
          { text: 'JavaScript', type: AlternativeType.TEXT, isCorrect: false },
          { text: 'Python', type: AlternativeType.TEXT, isCorrect: false },
          { text: 'TypeScript', type: AlternativeType.TEXT, isCorrect: true },
          { text: 'PHP', type: AlternativeType.TEXT, isCorrect: false },
        ],
      },
    },
  });

  // Question 2: True/False
  const question2 = await prisma.question.create({
    data: {
      text: 'O Sol é uma estrela?',
      type: QuestionType.TRUE_FALSE,
      topicId: topic.id,
      alternatives: {
        create: [
          { text: 'Verdadeiro', type: AlternativeType.TEXT, isCorrect: true },
          { text: 'Falso', type: AlternativeType.TEXT, isCorrect: false },
        ],
      },
    },
  });

  await prisma.examQuestion.createMany({
    data: [
      {
        examId: exam.id,
        questionId: question1.id,
        position: 1,
      },
      {
        examId: exam.id,
        questionId: question2.id,
        position: 2,
      },
    ],
  });

  console.log('Seed finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
