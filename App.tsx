
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
  ExternalLink,
  Eye,
  Key,
  Save,
  Zap
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
      // Chấm bài liên tục không chờ đợi
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
            notes: `${prev.notes || ''} | [Trang tiếp theo]: ${result.notes || ''}`
          };
        } else {
          currentResults.push({
            ...result,
            examId: (result.examId === 'UNKNOWN' || !result.examId) ? `KĐD-${Date.now()}` : result.examId
          });
        }
        setResults([...currentResults]);
      }
      setStudentWorks([]);
    } catch (err: any) {
      console.error(err);
      setError("Lỗi: " + (err.message || "Kiểm tra lại API Key hoặc kết nối mạng."));
    } finally {
      setLoading(false);
      setProcessingIndex(null);
    }
  };

  const clearKey = () => setAnswerKey(null);
  const removeStudentWork = (index: number) => setStudentWorks(prev => prev.filter((_, i) => i !== index));
  const openInNewTab = (url: string) => window.open(url, '_blank');
  const handleExport = () => results.length > 0 && exportToExcel(results);

  return (
    <div className="min-h-screen bg-blue-50 pb-32">
      {/* Header */}
      <header className="bg-blue-600 text-white py-4 px-8 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg shadow-inner">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">NKH - Chấm Bài AI</h1>
              <p className="text-[10px] text-blue-100 italic opacity-80">Flash Speed Grading System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-blue-700/50 p-1.5 rounded-xl border border-blue-400/30 backdrop-blur-sm">
            <div className="pl-2 text-blue-200">
              <Key size={18} />
            </div>
            <input 
              type="password" 
              placeholder="Nhập API Key cá nhân của bạn..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-48 md:w-64 placeholder:text-blue-300/60 text-white"
            />
            <button 
              onClick={handleSaveApiKey}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95
                ${isKeySaved ? 'bg-green-500 text-white scale-105' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
            >
              {isKeySaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {isKeySaved ? 'Đã lưu' : 'Lưu Key'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {!apiKey && (
          <div className="bg-blue-100 border-l-4 border-blue-500 p-5 rounded-r-2xl shadow-md animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-4 text-blue-900">
              <div className="p-3 bg-blue-500 text-white rounded-full">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="font-bold text-lg">Chào mừng đồng nghiệp!</p>
                <p className="text-sm opacity-90">Sử dụng model Flash để chấm bài cực nhanh. Lấy Key tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline font-bold text-blue-700 hover:text-blue-900">Google AI Studio</a>.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Answer Key Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden flex flex-col min-h-[480px]">
              <div className="bg-blue-600/5 p-4 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  <ClipboardCheck className="text-blue-600" size={20} />
                  Đáp án chuẩn
                </h2>
                <div className="flex gap-2">
                  {answerKey && (
                    <>
                      <button onClick={() => openInNewTab(answerKey.previewUrl)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"><ExternalLink size={18} /></button>
                      <button onClick={clearKey} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash2 size={18} /></button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex-1 p-4 flex flex-col">
                {!answerKey ? (
                  <label className="flex-1 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all group p-8 text-center">
                    <div className="p-5 bg-blue-100 rounded-full text-blue-600 group-hover:rotate-12 transition-transform shadow-sm">
                      <FileText size={36} />
                    </div>
                    <span className="mt-4 font-bold text-blue-800">Tải file Đáp án</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'key')} />
                  </label>
                ) : (
                  <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden h-[400px] relative">
                    {answerKey.mimeType.includes('pdf') ? (
                      <object data={answerKey.previewUrl} type="application/pdf" className="w-full h-full">
                        <div className="p-10 text-center"><button onClick={() => openInNewTab(answerKey.previewUrl)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Mở file PDF</button></div>
                      </object>
                    ) : (
                      <img src={answerKey.base64} alt="Preview" className="w-full h-full object-contain" />
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Student Work Section */}
          <div className="lg:col-span-8 space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden flex flex-col min-h-[480px]">
              <div className="bg-blue-600/5 p-4 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  <FileUp className="text-blue-600" size={20} />
                  Bài làm của HS ({studentWorks.length})
                </h2>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2 shadow-lg active:scale-95">
                  <FileUp size={18} /> Tải bài làm
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'student')} />
                </label>
              </div>
              
              <div className="p-6">
                {studentWorks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-blue-200 border-2 border-dashed border-blue-50 rounded-2xl">
                    <Zap size={64} className="mb-4 opacity-20" />
                    <p className="font-bold text-xl">Sẵn sàng chấm bài</p>
                    <p className="text-sm opacity-60">Model Flash sẽ giúp bạn tiết kiệm thời gian tối đa</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in zoom-in duration-300">
                    {studentWorks.map((work, idx) => (
                      <div key={idx} className="group relative aspect-[3/4] border-2 border-blue-50 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        {work.mimeType.includes('pdf') ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-red-50">
                            <i className="fa-solid fa-file-pdf text-red-500 text-5xl mb-3"></i>
                            <span className="text-[11px] text-center font-bold text-slate-700 line-clamp-2 uppercase">{work.name}</span>
                          </div>
                        ) : (
                          <img src={work.base64} alt={`Work ${idx}`} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button onClick={() => openInNewTab(work.previewUrl)} className="bg-white text-blue-600 p-3 rounded-full shadow-xl hover:scale-110 active:scale-90 transition-all"><Eye size={20} /></button>
                          <button onClick={() => removeStudentWork(idx)} className="bg-white text-red-600 p-3 rounded-full shadow-xl hover:scale-110 active:scale-90 transition-all"><Trash2 size={20} /></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-white/95 p-2.5 text-[10px] truncate border-t border-blue-50 font-bold text-blue-900">
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

        {/* FAB / Action Panel */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_-15px_rgba(37,99,235,0.4)] border border-blue-100 p-5 flex flex-col items-center gap-4">
            <button
              onClick={handleProcess}
              disabled={loading || !answerKey || studentWorks.length === 0}
              className={`
                w-full py-5 rounded-2xl font-black text-xl shadow-xl transition-all flex items-center justify-center gap-4 uppercase tracking-widest
                ${loading || !answerKey || studentWorks.length === 0 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:brightness-110 active:scale-95'}
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  ĐANG CHẤM {processingIndex}/{studentWorks.length}...
                </>
              ) : (
                <>
                  <Zap size={24} className="fill-current" />
                  BẮT ĐẦU CHẤM NGAY
                </>
              )}
            </button>
            
            {error && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 px-5 py-3 rounded-xl border border-red-200 w-full animate-shake text-xs font-bold">
                <AlertCircle size={20} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden mt-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="p-8 border-b border-blue-100 flex flex-wrap gap-6 items-center justify-between bg-gradient-to-br from-blue-50/50 to-transparent">
              <div>
                <h3 className="text-2xl font-black text-blue-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg"><Download size={24} /></div>
                  KẾT QUẢ CHẤM BÀI
                </h3>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl transition-all hover:-translate-y-1 active:scale-95"
              >
                <i className="fa-solid fa-file-excel text-2xl"></i>
                XUẤT EXCEL
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-8 py-6 font-black uppercase text-xs tracking-widest border-r border-blue-500">Số phách</th>
                    <th className="px-6 py-6 font-bold uppercase text-[10px] tracking-wider">Trắc nghiệm</th>
                    <th className="px-6 py-6 font-bold uppercase text-[10px] tracking-wider">Đúng/Sai</th>
                    <th className="px-6 py-6 font-bold uppercase text-[10px] tracking-wider">Trả lời ngắn</th>
                    <th className="px-6 py-6 font-bold uppercase text-[10px] tracking-wider">Tự luận</th>
                    <th className="px-8 py-6 font-black uppercase text-xs tracking-widest bg-blue-800 text-center">TỔNG</th>
                    <th className="px-8 py-6 font-bold uppercase text-[10px] tracking-wider">Nhận xét từ AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {results.map((res, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-8 py-6 font-black text-blue-900 border-r border-blue-50">{res.examId}</td>
                      <td className="px-6 py-6 font-bold text-slate-600">{res.multipleChoiceScore}</td>
                      <td className="px-6 py-6 font-bold text-slate-600">{res.trueFalseScore}</td>
                      <td className="px-6 py-6 font-bold text-slate-600">{res.shortAnswerScore}</td>
                      <td className="px-6 py-6 font-bold text-slate-600">{res.essayScore}</td>
                      <td className="px-8 py-6 bg-blue-50/40 text-center">
                        <span className="inline-block min-w-[50px] px-3 py-2 bg-blue-700 text-white rounded-xl font-black text-xl shadow-lg">
                          {res.totalScore}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-slate-500 text-[11px] italic max-w-sm leading-relaxed font-medium">{res.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-32 py-16 bg-blue-950 text-blue-300 text-center text-sm border-t-[12px] border-blue-600">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <h4 className="font-black text-white text-2xl uppercase italic">NKH SMART GRADER AI</h4>
          <p className="font-bold text-blue-400">Tốc độ tối đa với công nghệ Gemini Flash</p>
          <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-bold uppercase tracking-widest opacity-60">
             <div>Tác giả: <span className="text-white">GV Nguyễn Khắc Hưởng</span></div>
             <div>Đơn vị: <span className="text-white">THPT Quế Võ số 2 - Bắc Ninh</span></div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}} />
    </div>
  );
};

export default App;
