
import * as XLSX from 'xlsx';
import { GradingResult } from '../types';

export const exportToExcel = (results: GradingResult[], fileName: string = 'KetQuaChamBai.xlsx') => {
  const worksheetData = results.map(res => ({
    'Số phách': res.examId,
    'Điểm trắc nghiệm nhiều lựa chọn': res.multipleChoiceScore,
    'Điểm trắc nghiệm đúng sai': res.trueFalseScore,
    'Điểm trắc nghiệm trả lời ngắn': res.shortAnswerScore,
    'Điểm tự luận': res.essayScore,
    'Tổng điểm': res.totalScore,
    'Ghi chú': res.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kết quả');

  XLSX.writeFile(workbook, fileName);
};
