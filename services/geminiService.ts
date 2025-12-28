
import { GoogleGenAI, Type } from "@google/genai";
import { FileData, GradingResult } from "../types";

export const gradeExam = async (answerKey: FileData, studentWork: FileData, apiKey: string): Promise<GradingResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
  
  const systemInstruction = `
    Bạn là chuyên gia chấm thi OMR chính xác 100%. Nhiệm vụ của bạn là đối soát bài làm của học sinh với đáp án gốc.

    CẤU TRÚC PHIẾU TRẢ LỜI CỦA HỌC SINH (ẢNH BÀI LÀM):
    1. PHẦN I (TRẮC NGHIỆM - 30 CÂU):
       - Chia làm 3 cột lớn: Cột 1 (Câu 1-10), Cột 2 (Câu 11-20), Cột 3 (Câu 21-30).
       - Mỗi câu có 4 vòng tròn A, B, C, D. 
    2. PHẦN II (ĐÚNG/SAI - 6 CÂU):
       - Mỗi câu (Câu 1 - Câu 6) có 4 ý a, b, c, d. 
       - Mỗi ý có 2 cột "Đúng" và "Sai".
    3. PHẦN III (TRẢ LỜI NGẮN - 4 CÂU):
       - Mỗi câu là một lưới số gồm dấu (-), dấu (,), và các hàng số từ 0 đến 9.

    QUY TRÌNH CHẤM BÀI BẮT BUỘC (PHẢI THỰC HIỆN ĐỦ 3 BƯỚC):

    BƯỚC 1: TRÍCH XUẤT ĐÁP ÁN HỌC SINH (STUDENT SELECTIONS)
    - Chỉ công nhận ô được TÔ ĐẬM NHẤT trong hàng. 
    - Nếu học sinh tô mờ hoặc tô nhiều ô trong 1 câu -> Câu đó SAI.
    - Ghi lại danh sách: [Câu số]: [Lựa chọn của HS].

    BƯỚC 2: ĐỐI SOÁT VỚI ĐÁP ÁN GỐC (CROSS-REFERENCE)
    - Lấy danh sách từ Bước 1 so khớp từng câu với file "ĐÁP ÁN GỐC".
    - So sánh chuỗi/ký tự chính xác (Ví dụ: HS chọn B, Đáp án là C -> SAI).

    BƯỚC 3: TÍNH ĐIỂM THEO BAREM
    - Phần I: 16 câu đầu (1-16), mỗi câu đúng +0.25đ. Các câu từ 17-30 không tính nếu không có trong đáp án.
    - Phần II: Mỗi ý (a, b, c, d) đúng +0.25đ.
    - Phần III: Mỗi câu đúng +0.25đ.
    - Tự luận: Chấm theo nội dung viết tay so với đáp án gợi ý.

    YÊU CẦU ĐẦU RA:
    - Trả về JSON. 
    - TRONG PHẦN 'notes': Bạn PHẢI liệt kê cụ thể các câu học sinh làm sai theo định dạng: "Câu [X]: HS chọn [A], Đáp án [B] -> 0đ". Điều này giúp giáo viên đối soát lại.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Dưới đây là ĐÁP ÁN GỐC (Bảng chuẩn):" },
          {
            inlineData: {
              data: answerKey.base64.split(',')[1],
              mimeType: answerKey.mimeType
            }
          },
          { text: "Dưới đây là BÀI LÀM CỦA HỌC SINH (Ảnh OMR):" },
          {
            inlineData: {
              data: studentWork.base64.split(',')[1],
              mimeType: studentWork.mimeType
            }
          },
          { text: "Hãy thực hiện chấm bài cực kỳ nghiêm túc. Kiểm tra kỹ độ đậm nhạt của ô tô. Nếu HS tô lệch đáp án dù chỉ một chút cũng phải tính là 0 điểm." }
        ]
      }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0,
      topP: 0.1,
      topK: 1,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          examId: { type: Type.STRING, description: "Số phách trích xuất (ví dụ: 195)" },
          multipleChoiceScore: { type: Type.NUMBER, description: "Tổng điểm Phần I" },
          trueFalseScore: { type: Type.NUMBER, description: "Tổng điểm Phần II" },
          shortAnswerScore: { type: Type.NUMBER, description: "Tổng điểm Phần III" },
          essayScore: { type: Type.NUMBER, description: "Điểm tự luận" },
          totalScore: { type: Type.NUMBER, description: "Tổng điểm cuối cùng" },
          notes: { type: Type.STRING, description: "BẮT BUỘC: Liệt kê chi tiết các câu sai để đối soát" }
        },
        required: ["examId", "multipleChoiceScore", "trueFalseScore", "shortAnswerScore", "essayScore", "totalScore", "notes"]
      }
    }
  });

  try {
    const result = JSON.parse(response.text || '{}');
    return result as GradingResult;
  } catch (e) {
    console.error("Lỗi parse JSON từ AI:", response.text);
    throw new Error("AI trả về định dạng không hợp lệ. Vui lòng thử lại.");
  }
};
