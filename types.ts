
export interface GradingResult {
  examId: string;
  multipleChoiceScore: number;
  trueFalseScore: number;
  shortAnswerScore: number;
  essayScore: number;
  totalScore: number;
  notes?: string;
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
  previewUrl: string;
}
