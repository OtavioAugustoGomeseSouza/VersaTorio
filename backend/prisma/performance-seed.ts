import {
  AlternativeType,
  Prisma,
  PrismaClient,
  QuestionType,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { writeFile } from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

const DEFAULT_COUNTS = [1, 10, 50, 100];
const TEST_EMAIL_DOMAIN = 'perf.local';
const TEST_PASSWORD = 'perf123';

type SeededQuestion = {
  id: string;
  alternatives: Array<{ id: string }>;
};

type ScenarioSummary = {
  count: number;
  professorEmail: string;
  password: string;
  disciplineId: string;
  topicId: string;
  examId: string;
  versionId: string;
  questionCount: number;
  loginUserEmail: string;
};

function parseCounts(): number[] {
  const countsArg = process.argv.find((argument) =>
    argument.startsWith('--counts='),
  );
  const onlyArg = process.argv.find((argument) =>
    argument.startsWith('--only='),
  );

  const rawValue =
    countsArg?.replace('--counts=', '') ?? onlyArg?.replace('--only=', '');

  if (!rawValue) {
    return DEFAULT_COUNTS;
  }

  const counts = rawValue
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (counts.length === 0) {
    throw new Error('Use --counts=1,10,50,100 ou --only=50.');
  }

  return [...new Set(counts)].sort((first, second) => first - second);
}

function padCount(count: number): string {
  return String(count).padStart(3, '0');
}

function buildOrderData(questions: SeededQuestion[]): Prisma.InputJsonObject {
  return {
    questions: questions.map((question, questionIndex) => ({
      questionId: question.id,
      position: questionIndex + 1,
      alternatives: question.alternatives.map(
        (alternative, alternativeIndex) => ({
          alternativeId: alternative.id,
          position: alternativeIndex + 1,
        }),
      ),
    })),
  };
}

async function cleanupPerformanceData(): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: `@${TEST_EMAIL_DOMAIN}`,
      },
    },
  });
}

async function createLoginUsers(
  count: number,
  passwordHash: string,
): Promise<string> {
  const countLabel = padCount(count);

  for (let index = 1; index <= count; index += 1) {
    await prisma.user.create({
      data: {
        email: `login-${countLabel}-${String(index).padStart(3, '0')}@${TEST_EMAIL_DOMAIN}`,
        name: `Login Perf ${countLabel} ${index}`,
        password: passwordHash,
        role: Role.USER,
      },
    });
  }

  return `login-${countLabel}-${countLabel}@${TEST_EMAIL_DOMAIN}`;
}

async function createQuestion(
  count: number,
  questionNumber: number,
  topicId: string,
): Promise<SeededQuestion> {
  const question = await prisma.question.create({
    data: {
      text: `PERF ${padCount(count)} - Questao ${String(questionNumber).padStart(3, '0')}: qual alternativa representa corretamente um conceito de algoritmos?`,
      type: QuestionType.MULTIPLE_CHOICE,
      topicId,
      alternatives: {
        create: [
          {
            text: 'Um algoritmo é uma sequência finita de passos para resolver um problema.',
            type: AlternativeType.TEXT,
            isCorrect: true,
          },
          {
            text: 'Um algoritmo sempre depende de interface gráfica para executar.',
            type: AlternativeType.TEXT,
            isCorrect: false,
          },
          {
            text: 'Um algoritmo não pode ser representado por pseudocódigo.',
            type: AlternativeType.TEXT,
            isCorrect: false,
          },
          {
            text: 'Um algoritmo correto ignora dados de entrada inválidos.',
            type: AlternativeType.TEXT,
            isCorrect: false,
          },
        ],
      },
    },
    include: {
      alternatives: {
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
        },
      },
    },
  });

  return {
    id: question.id,
    alternatives: question.alternatives,
  };
}

async function createScenario(
  count: number,
  passwordHash: string,
): Promise<ScenarioSummary> {
  const countLabel = padCount(count);
  const professorEmail = `professor-${countLabel}@${TEST_EMAIL_DOMAIN}`;
  const loginUserEmail = await createLoginUsers(count, passwordHash);

  const professor = await prisma.user.create({
    data: {
      email: professorEmail,
      name: `Professor Performance ${countLabel}`,
      password: passwordHash,
      role: Role.USER,
    },
  });

  const discipline = await prisma.discipline.create({
    data: {
      name: `PERF ${countLabel} - Algoritmos e Estruturas de Dados`,
      userId: professor.id,
    },
  });

  const topic = await prisma.topic.create({
    data: {
      name: `PERF ${countLabel} - Árvores Binárias`,
      disciplineId: discipline.id,
    },
  });

  const questions: SeededQuestion[] = [];
  for (let questionNumber = 1; questionNumber <= count; questionNumber += 1) {
    questions.push(await createQuestion(count, questionNumber, topic.id));
  }

  const exam = await prisma.exam.create({
    data: {
      name: `PERF ${countLabel} - Prova com ${count} questões`,
      description: `Cenário de desempenho com ${count} questões objetivas.`,
      userId: professor.id,
      disciplineId: discipline.id,
      shuffleQuestions: true,
      shuffleAlternatives: true,
      versionsCountDefault: 1,
    },
  });

  await prisma.examQuestion.createMany({
    data: questions.map((question) => ({
      examId: exam.id,
      questionId: question.id,
    })),
  });

  const version = await prisma.examVersion.create({
    data: {
      name: 'Versão A',
      examId: exam.id,
      orderData: buildOrderData(questions),
    },
  });

  return {
    count,
    professorEmail,
    password: TEST_PASSWORD,
    disciplineId: discipline.id,
    topicId: topic.id,
    examId: exam.id,
    versionId: version.id,
    questionCount: questions.length,
    loginUserEmail,
  };
}

async function writeManifest(scenarios: ScenarioSummary[]): Promise<void> {
  const manifestPath = path.join(__dirname, 'performance-fixtures.json');
  const manifest = {
    generatedAt: new Date().toISOString(),
    password: TEST_PASSWORD,
    notes: [
      'Use professorEmail para testar listagem de questões, filtro por tópico, geração de versões e geração de PDF.',
      'Use loginUserEmail quando quiser medir login em um cenário com a quantidade correspondente de usuários de teste.',
      'Este seed apaga somente usuários com e-mail @perf.local antes de recriar os dados.',
    ],
    scenarios,
  };

  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  console.log(`Manifesto gerado em ${manifestPath}`);
}

async function main(): Promise<void> {
  const counts = parseCounts();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  console.log(`Preparando cenários de desempenho: ${counts.join(', ')}`);
  await cleanupPerformanceData();

  const scenarios: ScenarioSummary[] = [];
  for (const count of counts) {
    console.log(`Criando cenário com ${count} registro(s)...`);
    scenarios.push(await createScenario(count, passwordHash));
  }

  await writeManifest(scenarios);

  console.table(
    scenarios.map((scenario) => ({
      registros: scenario.count,
      professor: scenario.professorEmail,
      login: scenario.loginUserEmail,
      senha: scenario.password,
      questões: scenario.questionCount,
      examId: scenario.examId,
      versionId: scenario.versionId,
    })),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
