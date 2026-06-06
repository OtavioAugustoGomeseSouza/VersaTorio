import {
  buildExamVersionOrderData,
  type QuestionForExamOrder,
} from './exam-ordering.util';

function createSeededShuffle(seed = 11) {
  let currentSeed = seed;

  return <T>(array: T[]): T[] => {
    const copy = [...array];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      currentSeed = (currentSeed * 16807) % 2147483647;
      const swapIndex = currentSeed % (index + 1);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  };
}

function createQuestion(
  id: string,
  alternativesCount: number,
): QuestionForExamOrder {
  return {
    id,
    alternatives: Array.from({ length: alternativesCount }, (_, index) => ({
      id: `${id}-${index}`,
      isCorrect: index === 0,
    })),
  };
}

function countCorrectPositionsByAlternativesCount(
  questions: QuestionForExamOrder[],
  orderData: ReturnType<typeof buildExamVersionOrderData>,
) {
  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const countsByAlternativesCount = new Map<number, number[]>();

  for (const orderedQuestion of orderData.questions) {
    const question = questionById.get(orderedQuestion.questionId);

    if (!question || question.alternatives.length === 0) {
      continue;
    }

    const alternativesCount = question.alternatives.length;
    const correctAlternative = question.alternatives.find(
      (alternative) => alternative.isCorrect,
    );
    const correctPosition = orderedQuestion.alternatives.findIndex(
      (alternative) => alternative.alternativeId === correctAlternative?.id,
    );
    const currentCounts =
      countsByAlternativesCount.get(alternativesCount) ??
      Array.from({ length: alternativesCount }, () => 0);

    currentCounts[correctPosition] += 1;
    countsByAlternativesCount.set(alternativesCount, currentCounts);
  }

  return countsByAlternativesCount;
}

describe('buildExamVersionOrderData', () => {
  it('balances correct alternative positions inside each alternatives-count group', () => {
    const questions = [
      ...Array.from({ length: 8 }, (_, index) =>
        createQuestion(`question-4-${index}`, 4),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        createQuestion(`question-3-${index}`, 3),
      ),
    ];

    const orderData = buildExamVersionOrderData(questions, {
      shuffleAlternatives: true,
      distributeCorrectAlternatives: true,
      shuffleArray: createSeededShuffle(),
    });

    const countsByAlternativesCount = countCorrectPositionsByAlternativesCount(
      questions,
      orderData,
    );

    expect(countsByAlternativesCount.get(4)).toEqual([2, 2, 2, 2]);
    expect(countsByAlternativesCount.get(3)?.sort()).toEqual([1, 2, 2]);
  });

  it('keeps original alternative order when alternative shuffling is off', () => {
    const questions = [createQuestion('question-1', 4)];

    const orderData = buildExamVersionOrderData(questions, {
      shuffleAlternatives: false,
      distributeCorrectAlternatives: true,
      shuffleArray: createSeededShuffle(),
    });

    expect(orderData.questions[0].alternatives).toEqual([
      { alternativeId: 'question-1-0', position: 1 },
      { alternativeId: 'question-1-1', position: 2 },
      { alternativeId: 'question-1-2', position: 3 },
      { alternativeId: 'question-1-3', position: 4 },
    ]);
  });
});
