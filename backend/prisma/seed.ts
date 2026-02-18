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

  // Questions and Alternatives
  console.log('Seeding questions and alternatives...');

  // Question 1: Multiple Choice
  await prisma.question.create({
    data: {
      text: 'Qual destas linguagens é fortemente tipada?',
      type: QuestionType.MULTIPLE_CHOICE,
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
  await prisma.question.create({
    data: {
      text: 'O Sol é uma estrela?',
      type: QuestionType.TRUE_FALSE,
      alternatives: {
        create: [
          { text: 'Verdadeiro', type: AlternativeType.TEXT, isCorrect: true },
          { text: 'Falso', type: AlternativeType.TEXT, isCorrect: false },
        ],
      },
    },
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
