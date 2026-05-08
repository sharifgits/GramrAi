import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, BookOpen, Edit2, Save, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { classNames } from '../lib/utils';

import { GRAMMAR_DATA } from '../data/defaultTopics';

interface GrammarExplanationProps {
  key?: string;
  topicId: number;
  initialPage?: number;
  isCustom?: boolean;
  customData?: any;
  onClose: () => void;
  onStartPractice: (topicId: number) => void;
  onUpdateContent?: (updatedData: any) => void;
}

export function GrammarExplanation({ topicId, initialPage = 0, isCustom, customData, onClose, onStartPractice, onUpdateContent }: GrammarExplanationProps) {
  const [data, setData] = useState<any>(isCustom && customData ? customData : (GRAMMAR_DATA[topicId] || {
    title: "Coming Soon",
    subtitle: "We are currently writing this lesson.",
    content: []
  }));

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'lesson' | 'practice'>('lesson');
  const [currentPracticeIdx, setCurrentPracticeIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [practiceScore, setPracticeScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isCustom && customData) {
      setData(customData);
    }
  }, [customData, isCustom]);

  const pages = data.content || [];
  
  useEffect(() => {
    if (initialPage >= pages.length && pages.length > 0) {
      setCurrentPage(0);
    }
  }, [initialPage, pages.length]);

  const currentContent = pages[currentPage];
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;

  // Helper to render text with color coding and proper formatting
  const FormattedText = ({ text }: { text: string }) => {
    if (!text) return null;
    
    // Convert <br> tags to newlines and then split by lines
    const cleanText = text.replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');
    const lines = cleanText.split('\n');
    
    return (
      <div className="space-y-4">
        {lines.map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={index} className="h-2" />;

          // 1. Headings (Start with numbers like "1.", "6." or specific terms followed by colon)
          if (/^\d+\./.test(trimmed) || (trimmed.includes(':') && trimmed.length < 50 && !trimmed.includes('('))) {
            return (
              <h4 key={index} className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-400 mt-6 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                {trimmed}
              </h4>
            );
          }

          // 2. Examples with Bengali analysis (e.g. sentences with parentheses)
          if (trimmed.includes('(') && trimmed.includes(')') && (trimmed.includes('হলো') || trimmed.includes('যা'))) {
             return (
              <div key={index} className="bg-emerald-50/50 dark:bg-emerald-900/10 border-l-4 border-emerald-400 p-3 rounded-r-xl my-3">
                <p className="text-sm sm:text-[15px] font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed italic font-serif">
                  {trimmed}
                </p>
              </div>
             );
          }

          // 3. Regular sentences in English (often in examples) or general explanation
          const isMainlyEnglish = /^[A-Z]/.test(trimmed) && !/[\u0980-\u09FF]/.test(trimmed.split(' ')[0]);
          
          if (isMainlyEnglish && trimmed.length < 150) {
            return (
              <div key={index} className="pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 my-2">
                <p className="text-base font-black text-slate-800 dark:text-slate-100 leading-snug font-serif">
                  {trimmed}
                </p>
              </div>
            );
          }

          // 4. Default Bengali explanation text
          return (
            <p key={index} className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 leading-[1.8] font-serif">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  const handleNext = () => {
    if (!isLastPage) {
      setCurrentPage(p => p + 1);
      setViewMode('lesson');
    }
  };
  const handlePrev = () => {
    if (!isFirstPage) {
      setCurrentPage(p => p - 1);
      setViewMode('lesson');
    }
  };

  const startPracticeView = () => {
    if (currentContent?.practice && currentContent.practice.length > 0) {
      setViewMode('practice');
      setCurrentPracticeIdx(0);
      setSelectedOption(null);
      setShowExplanation(false);
      setPracticeScore(0);
      setIsFinished(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showExplanation) return;
    setSelectedOption(option);
    setShowExplanation(true);
    if (option === currentContent.practice[currentPracticeIdx].answer) {
      setPracticeScore(s => s + 1);
    }
  };

  const nextPracticeQuestion = () => {
    if (currentPracticeIdx < currentContent.practice.length - 1) {
      setCurrentPracticeIdx(p => p + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
    }
  };

  const resetPractice = () => {
    setCurrentPracticeIdx(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setPracticeScore(0);
    setIsFinished(false);
  };

  const startEditing = () => {
    setEditContent(JSON.parse(JSON.stringify(currentContent)));
    setIsEditing(true);
  };

  const saveEdit = () => {
    const newData = { ...data };
    newData.content[currentPage] = editContent;
    setData(newData);
    setIsEditing(false);
    if (onUpdateContent) {
      onUpdateContent(newData);
    }
  };

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 flex flex-col md:p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 px-5 md:max-w-2xl md:mx-auto w-full pt-6 bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800 rounded-t-3xl md:rounded-2xl shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 -ml-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0">
            <X size={20} className="text-slate-600 dark:text-slate-300" strokeWidth={3} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">
              {data.title?.replace(/^(English\s+)?Grammar\s+Lesson:\s*/i, '') || "Custom Lesson"}
            </h2>
            {data.subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{data.subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onUpdateContent && !isEditing && (
             <button 
              onClick={startEditing}
              className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Edit2 size={18} />
            </button>
          )}
          
          {/* Page progress indicator */}
          {pages.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 font-bold text-slate-400 dark:text-slate-500 text-xs ml-2">
              <BookOpen size={14} />
              <span>{currentPage + 1} / {pages.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pages Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full md:max-w-2xl md:mx-auto pb-24">
        <div className="p-3 sm:p-4 w-full">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
               <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 rotate-6 shadow-inner">
                   <span className="text-4xl">📝</span>
               </div>
               <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Notes are being added</h3>
            </div>
          ) : isEditing ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-800/50 rounded-2xl p-4 sm:p-6 shadow-xl"
            >
              <h3 className="text-lg font-black mb-4 text-purple-600 flex items-center gap-2">
                <Edit2 size={20} />
                Editing Page {currentPage + 1}
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Sub-topic Title</label>
                  <input 
                    type="text" 
                    value={editContent.title}
                    onChange={e => setEditContent({...editContent, title: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-500 text-purple-600 dark:text-purple-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Explanation Text</label>
                  <textarea 
                    value={editContent.text}
                    onChange={e => setEditContent({...editContent, text: e.target.value})}
                    rows={6}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-500 text-purple-600 dark:text-purple-400 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block flex justify-between items-center">
                    Key Points
                    <button 
                      onClick={() => setEditContent({...editContent, keyPoints: [...editContent.keyPoints, ""]})}
                      className="text-purple-500 hover:text-purple-600 flex items-center gap-1"
                    >
                      <Plus size={14} strokeWidth={3} /> Add Point
                    </button>
                  </label>
                  <div className="space-y-2">
                    {editContent.keyPoints.map((point: string, i: number) => (
                      <div key={i} className="flex gap-2">
                        <input 
                          type="text"
                          value={point}
                          onChange={e => {
                            const newPoints = [...editContent.keyPoints];
                            newPoints[i] = e.target.value;
                            setEditContent({...editContent, keyPoints: newPoints});
                          }}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold"
                        />
                        <button 
                          onClick={() => {
                            const newPoints = editContent.keyPoints.filter((_: any, idx: number) => idx !== i);
                            setEditContent({...editContent, keyPoints: newPoints});
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block flex justify-between items-center">
                    Examples
                    <button 
                      onClick={() => setEditContent({...editContent, examples: [...editContent.examples, { en: "", bn: "" }]})}
                      className="text-purple-500 hover:text-purple-600 flex items-center gap-1"
                    >
                      <Plus size={14} strokeWidth={3} /> Add Example
                    </button>
                  </label>
                  <div className="space-y-3">
                    {editContent.examples.map((ex: any, i: number) => {
                      const isString = typeof ex === 'string';
                      const enValue = isString ? ex : (ex?.en || "");
                      const bnValue = isString ? "" : (ex?.bn || "");
                      
                      return (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 relative group">
                        <input 
                          type="text"
                          placeholder={isString ? "Example sentence" : "English sentence"}
                          value={enValue}
                          onChange={e => {
                            const newEx = [...editContent.examples];
                            newEx[i] = { en: e.target.value, bn: bnValue };
                            setEditContent({...editContent, examples: newEx});
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold"
                        />
                        <input 
                          type="text"
                          placeholder="Bengali translation"
                          value={bnValue}
                          onChange={e => {
                            const newEx = [...editContent.examples];
                            newEx[i] = { en: enValue, bn: e.target.value };
                            setEditContent({...editContent, examples: newEx});
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold"
                        />
                        <button 
                          onClick={() => {
                            const newEx = editContent.examples.filter((_: any, idx: number) => idx !== i);
                            setEditContent({...editContent, examples: newEx});
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md scale-0 group-hover:scale-100 transition-transform"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )})}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-800 text-slate-500 font-black rounded-xl text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveEdit}
                    className="flex-1 py-3 bg-purple-500 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-purple-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {/* Book Page Card */}
                {viewMode === 'lesson' ? (
                  <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="inline-flex items-center justify-center px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full font-black text-[10px] uppercase tracking-widest">
                        Part {currentPage + 1}
                      </div>
                      {currentContent.practice && currentContent.practice.length > 0 && (
                        <button 
                          onClick={startPracticeView}
                          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95"
                        >
                          <ArrowRight size={14} className="rotate-[-45deg]" />
                          Practice ({currentContent.practice.length})
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 mb-4 leading-tight">
                      {currentContent.title?.replace(/^(English\s+)?Grammar\s+Lesson:\s*/i, '')}
                    </h3>
                    
                    {/* Key Points Banner */}
                    {currentContent.keyPoints && currentContent.keyPoints.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 rounded-r-xl p-4 mb-6">
                        <h4 className="font-black text-amber-800 dark:text-amber-500 mb-2 flex items-center gap-2 text-xs uppercase tracking-widest">
                          <Check size={14} strokeWidth={4} />
                          Key Points
                        </h4>
                        <ul className="space-y-1.5">
                          {currentContent.keyPoints.map((point: string, i: number) => (
                            <li key={i} className="text-amber-900/80 dark:text-amber-200/70 font-bold text-xs sm:text-sm flex gap-2">
                              <span className="text-amber-400 shrink-0">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mb-6">
                      <FormattedText text={currentContent.text} />
                    </div>
                    
                    {/* Examples Section */}
                    {currentContent.examples && currentContent.examples.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Examples</h4>
                        <div className="space-y-2">
                          {currentContent.examples && currentContent.examples.map((ex: any, eIdx: number) => {
                            if (typeof ex === 'string') {
                               return (
                                 <div key={eIdx} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 sm:p-4 border-2 border-slate-100 dark:border-slate-800/80">
                                   <p className="font-black text-slate-800 dark:text-slate-100 text-sm mb-1 font-serif">{ex}</p>
                                 </div>
                               );
                            }
                            return (
                              <div key={eIdx} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 sm:p-4 border-2 border-slate-100 dark:border-slate-800/80">
                                <div className="flex items-start gap-2 mb-2">
                                  <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                                    {(eIdx + 1).toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)])}
                                  </span>
                                  <p className="font-black text-slate-800 dark:text-slate-100 text-base leading-tight font-serif">{ex.en}</p>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-bold leading-relaxed font-serif pl-8">{ex.bn}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {currentContent.sourcePage && (
                      <div className="mt-8 pt-4 border-t-2 border-slate-100 dark:border-slate-800 text-right">
                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                          Source: {currentContent.sourcePage}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden relative">
                    {/* Practice Header */}
                    <div className="flex items-center justify-between mb-6">
                       <button 
                        onClick={() => setViewMode('lesson')}
                        className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-indigo-500 uppercase tracking-widest transition-colors"
                       >
                         <ArrowLeft size={14} />
                         Back to Lesson
                       </button>
                       <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                         Practice Progress: {currentPracticeIdx + 1} / {currentContent.practice.length}
                       </div>
                    </div>

                    {!isFinished ? (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest">Question</h4>
                          <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 leading-tight">
                            {currentContent.practice[currentPracticeIdx].question}
                          </p>
                        </div>

                        <div className="grid gap-3">
                          {currentContent.practice[currentPracticeIdx].options.map((option: string, oIdx: number) => {
                            const isCorrect = option === currentContent.practice[currentPracticeIdx].answer;
                            const isSelected = selectedOption === option;
                            
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleOptionSelect(option)}
                                className={classNames(
                                  "w-full p-4 rounded-xl text-left text-sm font-bold transition-all relative overflow-hidden flex items-center gap-3 border-2 text-purple-700 dark:text-purple-300",
                                  !showExplanation 
                                    ? "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-purple-400"
                                    : isCorrect 
                                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                                      : isSelected
                                        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-700 dark:text-rose-400"
                                        : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60"
                                )}
                              >
                                {showExplanation && isCorrect && <Check size={18} className="shrink-0" strokeWidth={3} />}
                                {showExplanation && isSelected && !isCorrect && <X size={18} className="shrink-0" strokeWidth={3} />}
                                <span>{option}</span>
                              </button>
                            );
                          })}
                        </div>

                        <AnimatePresence>
                          {showExplanation && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800 rounded-xl p-4 mt-4"
                            >
                              <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <BookOpen size={14} />
                                Explanation
                              </h5>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                                {currentContent.practice[currentPracticeIdx].explanation}
                              </p>
                              <button
                                onClick={nextPracticeQuestion}
                                className="w-full mt-4 py-3 bg-indigo-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                              >
                                {currentPracticeIdx < currentContent.practice.length - 1 ? 'Next Question' : 'Finish Practice'}
                                <ArrowRight size={14} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-4xl shadow-inner animate-bounce">
                          🎉
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1 uppercase tracking-tight">Practice Complete!</h3>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            You scored <span className="text-emerald-500 text-sm">{practiceScore}</span> out of <span className="text-indigo-500 text-sm">{currentContent.practice.length}</span>
                          </p>
                        </div>
                        <div className="flex gap-3 w-full max-w-xs">
                           <button 
                            onClick={resetPractice}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-sm"
                           >
                             Reset
                           </button>
                           <button 
                            onClick={() => setViewMode('lesson')}
                            className="flex-1 py-3 bg-emerald-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                           >
                             Continue
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Floating Action Bar / Page Controls (Only show when editing or loading) */}
      {(pages.length === 0 || isEditing) && (
        <div className="absolute bottom-0 left-0 right-0 p-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 z-20">
          <div className="md:max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
            
            {pages.length === 0 && (
              <button 
                 onClick={onClose}
                 className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-4 rounded-2xl font-bold"
               >
                 Go Back
               </button>
            )}
            
            {isEditing && (
               <div className="w-full flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] font-black text-indigo-400">
                  <Edit2 size={12} /> Editing Mode Active
               </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
