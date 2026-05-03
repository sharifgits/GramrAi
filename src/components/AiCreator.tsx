import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, FileText, Loader2, CheckCircle2, ChevronLeft, Send, AlertCircle, BookOpen, Upload, Download, RefreshCw, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateGrammarLesson } from '../services/geminiService';
import { GRAMMAR_DATA } from '../data/defaultTopics';
import { cn } from '../lib/utils';
import localforage from 'localforage';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface SmartCreatorProps {
  onBack: () => void;
  onLessonCreated: (lesson: any) => void;
  initialText?: string;
}

export function SmartCreator({ onBack, onLessonCreated, initialText = "" }: SmartCreatorProps) {
  const defaultText = `Direct Objects (সরাসরি কর্ম):
Direct object হলো যে noun বা pronoun, verb-এর action-টি সরাসরি receive করে।
Example:
The dog chased its tail.
 (এখানে noun "tail" verb "chased"-এর action receive করছে)

Mary reads a book every week.
 (এখানে noun "book" verb "reads"-এর action receive করছে)`;

  const [inputText, setInputText] = useState(initialText || defaultText);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [totalChunks, setTotalChunks] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [lastInitialText, setLastInitialText] = useState<string>("");
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [loadedPdf, setLoadedPdf] = useState<{ source: File | ArrayBuffer, numPages: number, name: string } | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | string>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableTopics, setAvailableTopics] = useState<any[]>([]);
  const [appendToExisting, setAppendToExisting] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string>('');
  const [showDataSettings, setShowDataSettings] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftText = await localforage.getItem('creator_draft_text');
        const draftInstruction = await localforage.getItem('creator_draft_instruction');
        if (draftText) setInputText(draftText as string);
        if (draftInstruction) setCustomInstruction(draftInstruction as string);
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    };
    loadDraft();
  }, []);

  // Save draft on change
  useEffect(() => {
    if (inputText) {
      localforage.setItem('creator_draft_text', inputText);
    }
    localforage.setItem('creator_draft_instruction', customInstruction);
  }, [inputText, customInstruction]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedTopics = await localforage.getItem<any[]>('custom_topics') || [];
        setAvailableTopics(storedTopics);
      } catch (err) {
        console.error("Failed to load data from storage", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (initialText && initialText !== lastInitialText) {
      setInputText(initialText);
      setLastInitialText(initialText);
    }
  }, [initialText, lastInitialText]);

  // Constants for batch process
  const CHUNK_SIZE = 25000; // characters

  const handleExportData = async () => {
    try {
      const data = await localforage.getItem('custom_topics');
      if (!data) {
        alert("No custom data found to export.");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grammar_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data.");
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!Array.isArray(data)) {
          throw new Error("Invalid format: Backup must be a list of topics.");
        }
        
        const confirmResult = window.confirm("This will REPLACE your current data. Are you sure?");
        if (confirmResult) {
          await localforage.setItem('custom_topics', data);
          alert("Import successful! Reloading...");
          window.location.reload();
        }
      } catch (err) {
        console.error("Import failed:", err);
        alert("Failed to import data. Please check the file format.");
      } finally {
        setIsImporting(false);
        if (importFileRef.current) importFileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };


  const extractSpecificPages = async (source: File | ArrayBuffer, pagesStr: string | number) => {
    if (!source) return;
    setIsExtractingPdf(true);
    setError(null);
    try {
      const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;
      if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error("Invalid source: Could not get a valid array buffer.");
      }
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      
      const pageNumbers = new Set<number>();
      const str = String(pagesStr).trim();
      if (!str) {
         setInputText('');
         setIsExtractingPdf(false);
         return;
      }

      for (const part of str.split(',')) {
        const range = part.split('-').map(s => parseInt(s.trim(), 10));
        if (range.length === 1 && !isNaN(range[0])) {
           pageNumbers.add(range[0]);
        } else if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
           const start = Math.min(range[0], range[1]);
           const end = Math.max(range[0], range[1]);
           for (let i = start; i <= end; i++) {
             pageNumbers.add(i);
           }
        }
      }

      const validPages = Array.from(pageNumbers).filter(p => !isNaN(p) && p >= 1 && p <= pdf.numPages).sort((a,b) => a-b);

      if (validPages.length === 0) {
        setError(`Invalid page selection. Please enter valid page numbers (e.g. 1, 2-5). The PDF has ${pdf.numPages} pages.`);
        setIsExtractingPdf(false);
        return;
      }
      if (validPages.length > 50) {
         setError(`Too many pages selected (${validPages.length}). Please select a maximum of 50 pages at once.`);
         setIsExtractingPdf(false);
         return;
      }
      
      let allText = '';
      let extractedCount = 0;
      for (const pageNum of validPages) {
         const page = await pdf.getPage(pageNum);
         const textContent = await page.getTextContent();
         const pageText = textContent.items
           .map((item: any) => item.str || '')
           .filter((s: string) => s.trim().length > 0)
           .join(' ');
           
         if (pageText.trim()) {
           allText += `[Page ${pageNum}]\n${pageText}\n\n`;
           extractedCount++;
         }
      }
      
      if (!allText.trim()) {
        setError(`Could not extract any text from the selected pages. They might be scanned or protected.`);
      } else {
        if (extractedCount < validPages.length) {
          console.warn(`Could not extract text from some pages.`);
        }
        setInputText(allText.trim());
      }
    } catch (err) {
      console.error("PDF extraction failed:", err);
      setError("Failed to extract text from the PDF file. Please try a different file.");
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    
    setIsExtractingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (!arrayBuffer) {
        throw new Error("Could not read file data.");
      }
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      setLoadedPdf({ source: file, numPages: pdf.numPages, name: file.name });
      setSelectedPage('1');
      
      await extractSpecificPages(file, "1");
    } catch (err) {
      console.error(err);
      setError("Failed to open PDF file.");
    } finally {
      setIsExtractingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const customKey = localStorage.getItem('GEMINI_API_KEY');
      const result = await generateGrammarLesson(inputText, customKey, customInstruction);
      if (result && result.subtopics && result.subtopics.length > 0) {
        // Merge all generated subtopics into one unified block for easier editing
        let allPractice: any[] = [];
        const mergedContent = result.subtopics.map((s: any, i: number) => {
          // Collect practice
          if (s.practice) allPractice = [...allPractice, ...s.practice];
          
          // Clean title and check if it already starts with a number
          const cleanedTitle = s.title?.replace(/^(English\s+)?Grammar\s+Lesson:\s*/i, '');
          const titleHasNumber = /^\d+\./.test(cleanedTitle);
          const displayTitle = titleHasNumber ? cleanedTitle : `${i + 1}. ${cleanedTitle}`;
          return `${displayTitle.toUpperCase()}\n\n${s.content}\n\n`;
        }).join('\n\n');
        
        result.subtopics = [{
          title: (result.title || "Comprehensive Lesson").replace(/^(English\s+)?Grammar\s+Lesson:\s*/i, ''),
          content: mergedContent,
          practice: allPractice
        }];
        result.title = (result.title || "Comprehensive Lesson").replace(/^(English\s+)?Grammar\s+Lesson:\s*/i, '');
      }
      setPreview(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "AI generation failed. Please check your internet connection or API settings.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoExtract = async () => {
    if (!inputText.trim()) return;
    setIsBatchProcessing(true);
    setError(null);
    
    try {
      const chunks = [];
      for (let i = 0; i < inputText.length; i += CHUNK_SIZE) {
        chunks.push(inputText.substring(i, i + CHUNK_SIZE));
      }
      setTotalChunks(chunks.length);
      
      const newTopics = [];
      let savedTopics = (await localforage.getItem<any[]>('custom_topics')) || [];
      const baseTopicId = 1000 + savedTopics.length; 
      const customKey = localStorage.getItem('GEMINI_API_KEY');
      
      for (let idx = 0; idx < chunks.length; idx++) {
        setCurrentChunk(idx + 1);
        try {
          const result = await generateGrammarLesson(chunks[idx], customKey, customInstruction);
          
          if (appendToExisting && selectedTopicId) {
            const topicIndex = savedTopics.findIndex((t: any) => t.id === selectedTopicId);
            if (topicIndex >= 0) {
              const topic = { ...savedTopics[topicIndex] };
              
              // Hydrate default roadmap modules if they don't have custom grammarData yet
              if (!topic.grammarData) {
                topic.grammarData = {
                  title: topic.title,
                  subtitle: "",
                  content: (topic.steps || []).map((s: any) => (GRAMMAR_DATA[s.topicId]?.content?.[s.pageIdx] || { title: s.title, text: "Lesson content coming soon.", keyPoints: [], examples: [] }))
                };
                // Normalize pageIdx to absolute array position in custom content
                topic.steps = (topic.steps || []).map((s: any, idx: number) => ({ ...s, pageIdx: idx }));
              }

              let basePageIdx = topic.steps?.length || 0;
              const topicIdNum = topic.steps?.[0]?.topicId || baseTopicId;

              if (selectedSubTopicId) {
                // Find the specific step to merge into
                const stepIndex = (topic.steps || []).findIndex((s: any) => s.id === selectedSubTopicId);
                if (stepIndex >= 0) {
                  const targetStep = topic.steps[stepIndex];
                  const pageIdx = targetStep.pageIdx;

                  if (topic.grammarData?.content) {
                    // Ensure content array is large enough (should be)
                    if (!topic.grammarData.content[pageIdx]) {
                      topic.grammarData.content[pageIdx] = {
                        title: targetStep.title,
                        keyPoints: [],
                        examples: [],
                        text: ""
                      };
                    }

                    // Merge ALL subtopics from this AI result chunk into the target category
                    (result.subtopics || []).forEach((newContentFromAI: any) => {
                      const existingContent = topic.grammarData.content[pageIdx];
                      
                      topic.grammarData.content[pageIdx] = {
                        ...existingContent,
                        keyPoints: [...(existingContent.keyPoints || []), ...(newContentFromAI.keyPoints || [])].slice(0, 20),
                        examples: [...(existingContent.examples || []), ...(newContentFromAI.examples || [])].slice(0, 15),
                        practice: [...(existingContent.practice || []), ...(newContentFromAI.practice || [])].slice(0, 20),
                        text: (existingContent.text ? existingContent.text + "\n\n" : "") + newContentFromAI.content.replace(/\*/g, '')
                      };
                    });
                  }
                }
              } else {
                // Append as new sub-topics
                const newSteps = (result.subtopics || []).map((sub: any, sIdx: number) => ({
                  id: `custom-step-${Date.now()}-${idx}-${sIdx}`,
                  title: sub.title,
                  subtitle: "",
                  topicId: topicIdNum,
                  pageIdx: basePageIdx + sIdx,
                  status: 'completed'
                }));
                
                const newContent = (result.subtopics || []).map((sub: any) => ({
                  title: sub.title,
                  category: sub.category,
                  keyPoints: sub.keyPoints || [],
                  text: sub.content.replace(/\*/g, ''),
                  examples: sub.examples || [],
                  practice: sub.practice || [],
                  sourcePage: sub.sourcePage || ""
                }));

                topic.steps = [...(topic.steps || []), ...newSteps];
                if (topic.grammarData) {
                  topic.grammarData.content = [...(topic.grammarData.content || []), ...newContent];
                } else {
                  topic.grammarData = {
                    title: topic.title,
                    subtitle: "",
                    content: newContent
                  };
                }
              }
              
              savedTopics[topicIndex] = topic;
              await localforage.setItem('custom_topics', savedTopics);
              setAvailableTopics([...savedTopics]);
              onLessonCreated(topic);
            }
          } else {
            // Transform the result into a Grammar Module format with clear syntactic categories
            const customModule = {
              id: `custom-${Date.now()}-${idx}`,
              title: result.title || "Untitled Topic",
              description: "",
              permanent: false, 
              steps: (result.subtopics || []).map((sub: any, sIdx: number) => ({
                id: `custom-step-${Date.now()}-${sIdx}`,
                title: sub.title,
                subtitle: "",
                topicId: baseTopicId + idx,
                pageIdx: sIdx,
                status: 'completed'
              })),
              grammarData: {
                title: result.title || "Untitled Topic",
                subtitle: "",
                content: (result.subtopics || []).map((sub: any) => ({
                  title: sub.title,
                  category: sub.category,
                  keyPoints: sub.keyPoints || [],
                  text: sub.content.replace(/\*/g, ''),
                  examples: sub.examples || [],
                  sourcePage: sub.sourcePage || ""
                }))
              }
            };
            
            newTopics.push(customModule);
            savedTopics.push(customModule);
            await localforage.setItem('custom_topics', savedTopics);
            // Clear draft after successful creation
            await localforage.removeItem('creator_draft_text');
            await localforage.removeItem('creator_draft_instruction');
            onLessonCreated(customModule); 
          }
        } catch (innerErr: any) {
          console.warn(`Chunk ${idx + 1} failed:`, innerErr);
          // Don't stop the whole process if one chunk fails, unless it's an API key error
          if (innerErr.message?.includes('API Key')) {
            throw innerErr;
          }
        }
      }
      
      alert("PDF information processing complete!");
      // Clear draft after successful creation
      await localforage.removeItem('creator_draft_text');
      await localforage.removeItem('creator_draft_instruction');
      onBack();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Auto-Extraction failed. Please check your data and try again.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleSave = async () => {
    if (preview) {
      const savedTopics = (await localforage.getItem<any[]>('custom_topics')) || [];
      const baseTopicId = 1000 + savedTopics.length;
      
      const customModule = {
        id: `custom-${Date.now()}`,
        title: preview.title || "Untitled Topic",
        description: "",
        permanent: false,
        steps: (preview.subtopics || []).map((sub: any, sIdx: number) => ({
          id: `custom-step-${Date.now()}-${sIdx}`,
          title: sub.title,
          subtitle: "",
          topicId: baseTopicId,
          pageIdx: sIdx,
          status: 'completed'
        })),
        grammarData: {
          title: preview.title || "Untitled Topic",
          subtitle: "",
          content: (preview.subtopics || []).map((sub: any) => ({
            title: sub.title,
            category: sub.category,
            keyPoints: sub.keyPoints || [],
            text: sub.content.replace(/\*/g, ''),
            examples: sub.examples || [],
            practice: sub.practice || [],
            sourcePage: sub.sourcePage || ""
          }))
        }
      };

      await localforage.setItem('custom_topics', [...savedTopics, customModule]);
      // Clear draft after successful creation
      await localforage.removeItem('creator_draft_text');
      await localforage.removeItem('creator_draft_instruction');
      onLessonCreated(customModule);
      onBack();
    }
  };

  const handleSubTopicEdit = (index: number, field: string, value: string) => {
    if (!preview) return;
    const newSubTopics = [...preview.subtopics];
    newSubTopics[index] = { ...newSubTopics[index], [field]: value };
    setPreview({ ...preview, subtopics: newSubTopics });
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[60vh] bg-[#0e121b] border-2 border-[#212b43] rounded-[2rem] shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 flex items-center justify-between border-b border-[#212b43] bg-[#131b2c]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} disabled={isBatchProcessing} className="p-2 bg-[#131b2c] rounded-xl shadow-sm text-[#a0aab8] hover:text-[#6e5aff] disabled:opacity-50">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="text-[#6e5aff]" size={20} />
              {showDataSettings ? "Data & Backups" : "AI Lesson Generator"}
            </h2>
            <p className="text-[9px] font-bold text-[#7a86a1] uppercase tracking-widest mt-0.5">
              {showDataSettings ? "Manage your custom content" : ""}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowDataSettings(!showDataSettings)}
          className={cn(
            "p-2.5 rounded-xl transition-all shadow-sm",
            showDataSettings 
              ? "bg-[#6e5aff] text-white" 
              : "bg-[#131b2c] text-[#a0aab8] hover:text-[#6e5aff]"
          )}
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        {showDataSettings ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-5 bg-[#6e5aff]/10 border-2 border-[#6e5aff]/20 rounded-2xl">
              <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                <Download size={18} className="text-[#6e5aff]" />
                Backup Data
              </h3>
              <p className="text-xs text-[#7a86a1] mb-4 leading-relaxed font-bold">
                ডাউনলোড করে রাখা ডাটা আপনি পরবর্তীতে রিসেট হওয়া অ্যাপ অথবা অন্য ফোনের অ্যাপে ইমপোর্ট করতে পারবেন। 
              </p>
              <button 
                onClick={handleExportData}
                className="w-full py-4 bg-[#6e5aff] text-white font-black rounded-xl shadow-lg shadow-[#6e5aff]/20 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Download size={16} /> Backup Now (.json)
              </button>
            </div>

            <div className="p-5 bg-[#131b2c] border-2 border-[#212b43] rounded-2xl">
              <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                <RefreshCw size={18} className="text-emerald-500" />
                Restore Data
              </h3>
              <p className="text-xs text-[#7a86a1] mb-4 leading-relaxed font-bold">
                আপনার ব্যাকআপ ফাইলটি এখানে সিলেক্ট করুন। এটি আপনার বর্তমান ডাটা রিপ্লেস করবে।
              </p>
              <button 
                onClick={() => importFileRef.current?.click()}
                disabled={isImporting}
                className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isImporting ? 'Importing...' : 'Restore Backup'}
              </button>
              <input 
                type="file" 
                ref={importFileRef}
                className="hidden"
                accept=".json"
                onChange={handleImportData}
              />
            </div>
            <button 
              onClick={() => setShowDataSettings(false)}
              className="w-full py-3 text-[#7a86a1] font-black text-[10px] uppercase tracking-widest hover:text-[#6e5aff]"
            >
              Close Settings
            </button>
          </motion.div>
        ) : isBatchProcessing ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-6">
             <div className="relative w-32 h-32 flex items-center justify-center">
               <div className="absolute inset-0 border-4 border-[#6e5aff]/20 dark:border-indigo-900 rounded-full" />
               <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                 <circle
                   cx="64"
                   cy="64"
                   r="60"
                   stroke="currentColor"
                   strokeWidth="8"
                   fill="transparent"
                   className="text-[#6e5aff] transition-all duration-500"
                   strokeDasharray={377}
                   strokeDashoffset={377 - (377 * currentChunk) / Math.max(1, totalChunks)}
                 />
               </svg>
               <BookOpen size={32} className="text-[#6e5aff] animate-pulse" />
             </div>
             
             <div>
               <h3 className="text-xl font-black text-white mb-2">Reading & Creating...</h3>
               <p className="text-xs font-bold text-[#a0aab8] uppercase tracking-widest">
                 Processing Chunk {currentChunk} of {totalChunks}
               </p>
               <p className="text-[10px] text-[#7a86a1] mt-2 max-w-sm mx-auto">
                 AI is scanning your PDF block by block and permanently generating new grammar topics. Please don't close this window.
               </p>
             </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
             <div className="space-y-1">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between ml-1 mb-2 gap-2">
                 <div className="flex items-center gap-2">
                   <label className="text-[9px] font-black text-[#7a86a1] uppercase tracking-widest">Source Material</label>
                   {inputText.length > 0 && (
                     <button 
                       onClick={() => {
                         if (window.confirm("আপনি কি নিশ্চিত? সব টেক্সট মুছে যাবে।")) {
                           setInputText("");
                           setCustomInstruction("");
                           localforage.removeItem('creator_draft_text');
                           localforage.removeItem('creator_draft_instruction');
                           setPreview(null);
                         }
                       }}
                       className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                     >
                       Clear Draft
                     </button>
                   )}
                 </div>
                 
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExtractingPdf}
                      className="px-3 py-1.5 bg-[#6e5aff]/10 hover:bg-[#6e5aff]/20 dark:bg-[#6e5aff]/10 dark:hover:bg-[#6e5aff]/20 text-indigo-600 dark:text-[#8b79ff] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isExtractingPdf ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {isExtractingPdf ? 'Extracting...' : 'Upload PDF'}
                    </button>
                 </div>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept=".pdf" 
                   onChange={handleFileUpload} 
                 />
               </div>

               {loadedPdf && (
                 <div className="flex flex-wrap items-center gap-3 mb-2 bg-[#6e5aff]/10 p-3 rounded-xl border border-[#6e5aff]/20">
                   <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                     <FileText size={16} className="text-[#6e5aff] shrink-0" />
                     <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 truncate" title={loadedPdf.name}>
                       {loadedPdf.name}
                     </span>
                   </div>
                   <div className="flex items-center gap-2 shrink-0">
                     <span className="text-[10px] font-bold text-[#a0aab8] uppercase tracking-widest">Page</span>
                     <input 
                       type="text"
                       value={selectedPage}
                       onChange={(e) => setSelectedPage(e.target.value)}
                       onBlur={(e) => {
                         const val = e.target.value;
                         if (val.trim()) {
                           extractSpecificPages(loadedPdf.source, val);
                         }
                       }}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                           const val = (e.target as HTMLInputElement).value;
                           if (val.trim()) {
                             extractSpecificPages(loadedPdf.source, val);
                           }
                         }
                       }}
                       placeholder="e.g. 1,3-5"
                       disabled={isExtractingPdf}
                       className="w-24 h-8 px-2 text-xs font-black text-center bg-[#131b2c] border-2 border-[#6e5aff]/20 rounded-lg focus:outline-none focus:border-[#6e5aff] shadow-sm disabled:opacity-50"
                     />
                     <span className="text-[10px] font-bold text-[#7a86a1]">/ {loadedPdf.numPages}</span>
                   </div>
                 </div>
               )}

               <textarea 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 className="w-full h-48 p-4 bg-[#0b0e14] border-2 border-[#212b43] rounded-2xl text-xs focus:outline-none focus:border-[#6e5aff] transition-all font-medium leading-relaxed mt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                 placeholder="Paste text from your PDF here..."
               />
               <p className="text-[10px] text-[#7a86a1] text-right font-bold">{inputText.length} characters</p>
               
               <div className="space-y-1 mt-4">
                 <label className="text-[9px] font-black text-[#7a86a1] uppercase tracking-widest ml-1">Custom Instruction / Prompt (Optional)</label>
                 <textarea 
                   value={customInstruction}
                   onChange={(e) => setCustomInstruction(e.target.value)}
                   className="w-full h-20 p-3 bg-[#6e5aff]/10 border-2 border-[#6e5aff]/20 rounded-xl text-xs focus:outline-none focus:border-[#6e5aff] transition-all font-medium leading-relaxed"
                   placeholder=""
                 />
               </div>

               <AnimatePresence>
                 {preview && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }} 
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="mt-6 p-4 md:p-6 bg-emerald-50/30 dark:bg-emerald-500/5 border-2 border-emerald-100 dark:border-emerald-500/20 rounded-3xl space-y-5"
                   >
                     <div className="flex items-center justify-between">
                       <h3 className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                         <CheckCircle2 size={18} />
                       </h3>
                       <button 
                         onClick={() => setPreview(null)}
                         className="p-2 text-[#7a86a1] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
                          title="Close Preview"
                       >
                         <X size={18} />
                       </button>
                     </div>

                     <div className="space-y-3">
                       <div className="space-y-1">
                         <label className="text-[9px] font-black text-[#7a86a1] uppercase tracking-widest ml-1">Topic Title</label>
                         <input 
                           value={preview.title}
                           onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                           className="w-full p-3 bg-[#131b2c] border-2 border-emerald-100 dark:border-emerald-500/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
                         />
                       </div>

                       <div className="space-y-4 pt-2">
                         <label className="text-[9px] font-black text-[#7a86a1] uppercase tracking-widest ml-1">Unified Lesson Preview</label>
                         <div className="p-5 md:p-8 bg-[#0e121b] border-2 border-[#212b43] rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                           <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors" />
                           
                           {(preview.subtopics || []).map((sub: any, idx: number) => (
                             <textarea 
                               key={idx}
                               value={sub.content}
                               onChange={(e) => handleSubTopicEdit(idx, 'content', e.target.value)}
                               className="w-full min-h-[450px] text-[12px] font-medium text-[#7a86a1] bg-slate-50/10 dark:bg-slate-800/10 p-6 rounded-[2rem] focus:outline-none border-2 border-transparent focus:border-emerald-500 transition-all leading-loose shadow-inner [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                               placeholder="Combined Lesson Content..."
                             />
                           ))}
                           <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 py-2 px-4 rounded-full w-fit mx-auto mt-4">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           </div>
                         </div>
                       </div>
                     </div>

                     <div className="flex gap-3">
                       <button 
                         onClick={handleSave}
                         className="flex-1 py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"
                       >
                         <CheckCircle2 size={18} /> Save Permanently
                       </button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               {error && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex items-start gap-3">
                   <AlertCircle className="text-rose-500 shrink-0" size={18} />
                   <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{error}</p>
                 </motion.div>
               )}

               <div className="pt-6">
                 <button 
                   onClick={handleGenerate}
                   disabled={isGenerating || !inputText.trim()}
                   className="w-full py-5 bg-[#6e5aff] text-white font-black rounded-2xl shadow-xl shadow-[#6e5aff]/20 text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-[#5a48d1] transition-all"
                 >
                   {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                   {isGenerating ? 'Analyzing Content...' : 'Generate Grammar Lesson'}
                 </button>
                 
               </div>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function AiCreator({ initialText = "", onLessonCreated }: { initialText?: string, onLessonCreated?: (lesson: any) => void }) {
  const [activeTab, setActiveTab] = useState<'create'>('create');
  
  return (
    <div className="space-y-6">
      <SmartCreator 
        onBack={() => {}} 
        onLessonCreated={(lesson) => {
          if (onLessonCreated) onLessonCreated(lesson);
          // Optional: redirect to learn tab or show success
        }} 
        initialText={initialText}
      />
    </div>
  );
}
