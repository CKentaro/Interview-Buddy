/**
 * 回答エンティティ（ユビキタス言語: Answer）。
 * ユーザーが 1 つの Question に対して回答した内容を表す。
 */
export type Answer = {
  id: string;
  content: string;
  questionId: string;
};
