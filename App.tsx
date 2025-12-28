
import React, { useState, useEffect } from 'react';
import { FileData, GradingResult } from './types';
import { gradeExam } from './services/geminiService';
import { exportToExcel } from './services/excelService';
import { 
  FileUp, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  GraduationCap, 
  ClipboardCheck,
  Loader2,
  FileText,
  X,
  ExternalLink,
  Eye,
  Key,
  Save
} from 'lucide-react';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [answerKey, setAnswerKey] = useState<FileData | null>(null);
  const [studentWorks, setStudentWorks] = useState<FileData[]>([]);
  const [results, setResults] = useState<GradingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load API Key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySaved(true);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setIsKeySaved(true);
      // Brief visual feedback
      setTimeout(() => setIsKeySaved(false), 2000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'key' | 'student') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: FileData[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = await new Promise<FileData>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            mimeType: file.type,
            base64: reader.result as string,
            previewUrl: URL.createObjectURL(file)
          });
        };
        reader.readAsDataURL(file);
      });
      newFiles.push(data);
    }

    if (type === 'key') {
      setAnswerKey(newFiles[0]);
    } else {
      setStudentWorks(prev => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const handleProcess = async () => {
    if (!apiKey.trim()) {
      setError("Vui lòng nhập API Key Google AI Studio để tiếp tục.");
      return;
    }
    if (!answerKey || studentWorks.length === 0) {
      setError("Vui lòng tải lên cả đáp án và ít nhất một bài làm của học sinh.");
      return;
    }

    setLoading(true);
    setError(null);

    const currentResults = [...results];

    try {
      for (let i = 0; i < studentWorks.length; i++) {
        setProcessingIndex(i + 1);
        const result = await gradeExam(answerKey, studentWorks[i], apiKey.trim());
        
        if ((result.examId === 'UNKNOWN' || !result.examId) && currentResults.length > 0) {
          const lastIdx = currentResults.length - 1;
          const prev = currentResults[lastIdx];
          
          currentResults[lastIdx] = {
            ...prev,
            multipleChoiceScore: Number((prev.multipleChoiceScore + result.multipleChoiceScore).toFixed(2)),
            trueFalseScore: Number((prev.trueFalseScore + result.trueFalseScore).toFixed(2)),
            shortAnswerScore: Number((prev.shortAnswerScore + result.shortAnswerScore).toFixed(2)),
            essayScore: Number((prev.essayScore + result.essayScore).toFixed(2)),
            totalScore: Number((prev.totalScore + result.totalScore).toFixed(2)),
            notes: `${prev.notes || ''} | [Trang bổ sung]: ${result.notes || ''}`
          };
        } else {
          currentResults.push({
            ...result,
            examId: result.examId === 'UNKNOWN' ? `KĐD-${Date.now()}` : result.examId
          });
        }
      }
      setResults(currentResults);
      setStudentWorks([]);
    } catch (err: any) {
      console.error(err);
      setError("Lỗi: " + (err.message || "Đã xảy ra lỗi khi gọi AI. Kiểm tra lại API Key hoặc kết nối mạng."));
    } finally {
      setLoading(false);
      setProcessingIndex(null);
    }
  };

  const clearKey = () => setAnswerKey(null);
  
  const removeStudentWork = (index: number) => {
    setStudentWorks(prev => prev.filter((_, i) => i !== index));
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  const handleExport = () => {
    if (results.length === 0) return;
    exportToExcel(results);
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-32">
      {/* Header */}
      <header className="bg-blue-600 text-white py-4 px-8 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">NKH - Chấm Bài AI</h1>
              <p className="text-[10px] text-blue-100 italic hidden md:block">GV Nguyễn Khắc Hưởng - THPT Quế Võ số 2</p>
            </div>
          </div>

          {/* API Key Configuration */}
          <div className="flex items-center gap-2 bg-blue-700/50 p-1.5 rounded-xl border border-blue-400/30">
            <div className="pl-2 text-blue-200">
              <Key size={18} />
            </div>
            <input 
              type="password" 
              placeholder="Nhập Google AI API Key..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-48 md:w-64 placeholder:text-blue-300/60"
            />
            <button 
              onClick={handleSaveApiKey}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm
                ${isKeySaved ? 'bg-green-500 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
            >
              {isKeySaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {isKeySaved ? 'Đã lưu' : 'Lưu Key'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Welcome Alert if no key */}
        {!apiKey && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl shadow-sm animate-bounce-short">
            <div className="flex items-center gap-3 text-yellow-800">
              <AlertCircle size={24} />
              <div>
                <p className="font-bold">Hướng dẫn: Vui lòng nhập API Key của bạn!</p>
                <p className="text-sm">Bạn có thể lấy key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline font-bold">Google AI Studio</a> để bắt đầu sử dụng.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Section: Answer Key (Left Side) */}
          <div className="lg:col-span-4 space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden flex flex-col min-h-[450px]">
              <div className="bg-blue-600/5 p-4 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <ClipboardCheck className="text-blue-600" size={20} />
                  Đáp án gốc
                </h2>
                <div className="flex gap-2">
                  {answerKey && (
                    <>
                      <button 
                        onClick={() => openInNewTab(answerKey.previewUrl)}
                        className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
                        title="Mở trong tab mới"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button onClick={clearKey} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex-1 p-4 flex flex-col">
                {!answerKey ? (
                  <label className="flex-1 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all group p-8 text-center">
                    <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                      <FileText size={32} />
                    </div>
                    <span className="mt-4 font-medium text-blue-700">Tải đáp án (Ảnh/PDF)</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'key')} />
                  </label>
                ) : (
                  <div className="flex-1 rounded-lg border border-slate-200 bg-white overflow-hidden h-[400px] relative group">
                    {answerKey.mimeType.includes('pdf') ? (
                      <object
                        data={answerKey.previewUrl}
                        type="application/pdf"
                        className="w-full h-full"
                      >
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                          <p className="text-slate-500 mb-4">Trình duyệt không thể hiển thị PDF trực tiếp.</p>
                          <button 
                            onClick={() => openInNewTab(answerKey.previewUrl)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                          >
                            <ExternalLink size={16} /> Mở file PDF
                          </button>
                        </div>
                      </object>
                    ) : (
                      <img src={answerKey.previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Section: Student Works (Right Side) */}
          <div className="lg:col-span-8 space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden flex flex-col min-h-[450px]">
              <div className="bg-blue-600/5 p-4 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <FileUp className="text-blue-600" size={20} />
                  Bài làm học sinh ({studentWorks.length})
                </h2>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-2 shadow-md active:scale-95">
                  <FileUp size={16} />
                  Thêm bài làm
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'student')} />
                </label>
              </div>
              
              <div className="p-6">
                {studentWorks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-blue-300 border-2 border-dashed border-blue-50 rounded-xl">
                    <FileUp size={48} className="mb-4 opacity-20" />
                    <p className="font-medium text-lg">Chưa có bài làm nào</p>
                    <p className="text-sm opacity-60">Vui lòng tải lên file ảnh hoặc PDF bài làm của học sinh</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {studentWorks.map((work, idx) => (
                      <div key={idx} className="group relative aspect-[3/4] border border-blue-100 rounded-xl overflow-hidden bg-slate-50 shadow-sm hover:shadow-md transition-all">
                        {work.mimeType.includes('pdf') ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-blue-50/50">
                            <i className="fa-solid fa-file-pdf text-red-500 text-5xl mb-3 shadow-sm"></i>
                            <span className="text-[11px] text-center font-bold text-slate-700 line-clamp-2 px-2 uppercase">{work.name}</span>
                            <div className="mt-2 text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-bold">PDF FILE</div>
                          </div>
                        ) : (
                          <img src={work.previewUrl} alt={`Student work ${idx}`} className="w-full h-full object-cover" />
                        )}
                        
                        <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openInNewTab(work.previewUrl)}
                            className="bg-white text-blue-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => removeStudentWork(idx)}
                            className="bg-white text-red-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                            title="Xóa bài làm"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 bg-white/95 p-2 text-[10px] truncate border-t border-blue-50 font-medium text-slate-600">
                          {work.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(37,_99,_235,_0.3)] border border-blue-100 p-4 flex flex-col items-center gap-3">
            <button
              onClick={handleProcess}
              disabled={loading || !answerKey || studentWorks.length === 0}
              className={`
                w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3
                ${loading || !answerKey || studentWorks.length === 0 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Đang chấm bài {processingIndex}/{studentWorks.length}...
                </>
              ) : (
                <>
                  <CheckCircle2 />
                  Bắt đầu chấm {studentWorks.length} bài
                </>
              )}
            </button>
            
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100 w-full animate-pulse">
                <AlertCircle size={16} />
                <span className="text-xs font-medium">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Table Section */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-blue-100 flex flex-wrap gap-4 items-center justify-between bg-blue-50/50">
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <Download className="text-blue-600" size={24} />
                Bảng điểm tổng hợp ({results.length} bài)
              </h3>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg transition-all hover:-translate-y-1 active:translate-y-0"
              >
                <i className="fa-solid fa-file-excel text-xl"></i>
                TẢI FILE EXCEL
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Số phách</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Trắc nghiệm</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Đúng/Sai</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Trả lời ngắn</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Tự luận</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider bg-blue-700">TỔNG ĐIỂM</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Nhận xét AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {results.map((res, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/80 transition-colors">
                      <td className="px-6 py-4 font-black text-blue-900">{res.examId}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{res.multipleChoiceScore}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{res.trueFalseScore}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{res.shortAnswerScore}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{res.essayScore}</td>
                      <td className="px-6 py-4 bg-blue-50/30">
                        <span className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-black text-lg shadow-sm">
                          {res.totalScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs italic max-w-xs leading-relaxed">{res.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-12 bg-blue-900 text-blue-300 text-center text-sm border-t-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex justify-center items-center gap-4 mb-4">
             <div className="h-px w-12 bg-blue-700"></div>
             <GraduationCap size={24} className="text-blue-500" />
             <div className="h-px w-12 bg-blue-700"></div>
          </div>
          <p className="font-bold text-white text-lg tracking-wide uppercase">CHẤM BÀI THÔNG MINH TRẮC NGHIỆM VÀ TỰ LUẬN</p>
          <p className="font-medium text-blue-200">App chấm bài tự động - Phát triển bởi GV Nguyễn Khắc Hưởng</p>
          <p className="opacity-80">FB: https://www.facebook.com/nguyenkhachuongqv2</p>
          <div className="pt-6 text-[10px] opacity-40 uppercase tracking-widest">
            Powered by Google Gemini AI & React
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-short {
          animation: bounce-short 2s infinite;
        }
      `}} />
    </div>
  );
};

export default App;
