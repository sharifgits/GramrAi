const fs = require('fs');

let code = fs.readFileSync('src/components/LessonRoadmap.tsx', 'utf8');

const replacement = `export function GrammarTopics({ onViewTopic, customTopics = [], onUpdateTopic, onDeleteTopic }: GrammarTopicsProps) {
  const allModules = customTopics;

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any, type: 'module' | 'step' } | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: any, type: 'module' | 'step' } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const startPos = useRef<{ x: number, y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, item: any, type: 'module' | 'step') => {
    let x = 0; let y = 0;
    if ('touches' in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }
    
    startPos.current = { x, y };

    longPressTimer.current = setTimeout(() => {
      setContextMenu({ x, y, item, type });
      startPos.current = null;
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    startPos.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!startPos.current || !longPressTimer.current) return;

    let x = 0; let y = 0;
    if ('touches' in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }

    const dist = Math.sqrt(Math.pow(x - startPos.current.x, 2) + Math.pow(y - startPos.current.y, 2));
    if (dist > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      startPos.current = null;
    }
  };

  const handleContextMenuAction = (action: 'edit' | 'delete' | 'permanent') => {
    if (!contextMenu) return;

    if (contextMenu.type === 'module') {
      if (action === 'permanent' && onUpdateTopic) {
        onUpdateTopic({ ...contextMenu.item, permanent: true });
      } else if (action === 'edit') {
        setEditingItem({ item: contextMenu.item, type: 'module' });
      } else if (action === 'delete' && onDeleteTopic) {
        onDeleteTopic(contextMenu.item.id);
      }
    } else if (contextMenu.type === 'step') {
      if (action === 'edit') {
        setEditingItem({ item: contextMenu.item, type: 'step' });
      } else if (action === 'delete') {
        const foundModule = allModules.find(m => (m.steps || []).some((s: any) => s.id === contextMenu.item.id));
        if (foundModule && onUpdateTopic) {
          const module = { ...foundModule };
          if (!module.grammarData) {
            module.grammarData = {
              title: module.title,
              subtitle: module.description,
              content: (module.steps || []).map((s: any) => ({ title: s.title, text: "Lesson content coming soon.", keyPoints: [], examples: [] }))
            };
          }

          const newSteps = (module.steps || []).filter((s: any) => s.id !== contextMenu.item.id);
          const newGrammarData = {
            ...module.grammarData,
            content: (module.grammarData.content || []).filter((_: any, idx: number) => idx !== contextMenu.item.pageIdx)
          };
          
          const indexedSteps = newSteps.map((s: any, idx: number) => ({ ...s, pageIdx: idx }));
          onUpdateTopic({ ...module, steps: indexedSteps, grammarData: newGrammarData });
        }
      }
    }
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      document.addEventListener('touchstart', handleClick);
    }
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [contextMenu]);

  return (
    <div className="w-full pb-24 md:pt-4">
       {(allModules || []).map((module, mIdx) => (
        <div key={module.id} className="mb-10 px-4 md:px-0 max-w-xl mx-auto w-full">
          <div 
            className="mb-6 flex items-center justify-between sm:px-4 select-none relative"
            onTouchStart={(e) => handleTouchStart(e, module, 'module')}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onMouseDown={(e) => handleTouchStart(e, module, 'module')}
            onMouseUp={handleTouchEnd}
            onMouseMove={handleTouchMove}
            onMouseLeave={handleTouchEnd}
          >
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                {module.title}
                {module.permanent && <ShieldCheck size={18} className="text-indigo-500" />}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{module.description}</p>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({ 
                  x: e.clientX || (window.innerWidth / 2), 
                  y: e.clientY || (window.innerHeight / 2), 
                  item: module, 
                  type: 'module' 
                });
              }}
              className="p-2 ml-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg hover:text-indigo-500 transition-colors sm:hidden"
            >
              <Edit2 size={16} />
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute top-4 bottom-4 left-[19px] sm:left-[23px] w-1 bg-slate-200 dark:bg-slate-800 rounded-full z-0" />

            <div className="space-y-3">
              {(module.steps || []).map((step: any) => {
                const isCompleted = step.status === "completed";
                const isActive = step.status === "active";
                const isLocked = step.status === "locked";

                let Icon = BookOpen;
                if (isLocked) Icon = Lock;
                if (isCompleted) Icon = Check;
                if (isActive) Icon = Star;

                return (
                    <motion.div 
                    key={step.id}
                    whileHover={!isLocked ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                    onClick={() => !isLocked && onViewTopic(step.topicId, step.pageIdx, !!module.grammarData)}
                    onTouchStart={(e) => !module.permanent && handleTouchStart(e, step, 'step')}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onMouseDown={(e) => !module.permanent && handleTouchStart(e, step, 'step')}
                    onMouseUp={handleTouchEnd}
                    onMouseMove={handleTouchMove}
                    onMouseLeave={handleTouchEnd}
                    className={cn(
                      "flex items-center gap-4 relative z-10 select-none",
                      !isLocked ? "cursor-pointer" : ""
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center border-[3px] border-slate-50 dark:border-[#0f172a] shadow-sm transition-colors",
                      isCompleted ? "bg-emerald-500 text-white border-emerald-100/50 dark:border-emerald-900/50" :
                      isActive ? "bg-indigo-500 text-white shadow-indigo-200 dark:shadow-none border-indigo-100 dark:border-indigo-900/50" :
                      "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    )}>
                      <Icon size={isCompleted ? 20 : 18} strokeWidth={isCompleted ? 3 : 2} />
                    </div>

                    <div className={cn(
                      "flex-1 p-2.5 sm:p-3 rounded-lg border-2 transition-all",
                      isCompleted ? "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/60 shadow-sm" :
                      isActive ? "bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 shadow-sm" :
                      "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/50 opacity-80"
                    )}>
                      <div className="flex justify-between items-center gap-2">
                        <div>
                          <h3 className={cn(
                            "text-sm sm:text-base font-black",
                            isLocked ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-100"
                          )}>
                            {step.title}
                          </h3>
                        </div>
                        
                        {!isLocked && (
                          <div className={cn(
                            "w-6 h-6 shrink-0 rounded-full flex items-center justify-center",
                            isCompleted ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" :
                            "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                          )}>
                            <ArrowRight size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      
      <AnimatePresence>
        {contextMenu && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20" 
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 w-48 overflow-hidden"
              style={{ 
                top: Math.min(contextMenu.y, window.innerHeight - 200), 
                left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 200)) 
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 pointer-events-none">
              <p className="text-xs font-bold text-slate-500 truncate">{contextMenu.item.title}</p>
            </div>
            
            <button
              onClick={() => handleContextMenuAction('edit')}
              className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
            >
               <Edit2 size={16} /> Edit Title
            </button>
            
            {(contextMenu.type === 'module' && !contextMenu.item.permanent) || contextMenu.type === 'step' ? (
              <>
                {contextMenu.type === 'module' && (
                  <button
                    onClick={() => handleContextMenuAction('permanent')}
                    className="w-full text-left px-4 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                  >
                    <ShieldCheck size={16} /> Make Permanent
                  </button>
                )}
                <button
                  onClick={() => handleContextMenuAction('delete')}
                  className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete {contextMenu.type === 'module' ? 'Topic' : 'Sub-topic'}
                </button>
              </>
            ) : (
                <div className="px-4 py-3 text-[10px] text-slate-500 text-center font-black uppercase tracking-widest leading-relaxed border-t border-slate-100 dark:border-slate-700 mt-1">
                  <ShieldCheck size={14} className="mx-auto mb-1 text-indigo-500" />
                  Permanent System Topic
                </div>
            )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setEditingItem(null)}
                className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
              
              <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit2 size={20} className="text-indigo-500" />
                Edit {editingItem.type === 'module' ? 'Topic' : 'Sub-topic'}
              </h3>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Title</label>
                  <input 
                    type="text" 
                    value={editingItem.item.title} 
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, title: e.target.value } })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                
                <button
                  onClick={() => {
                    if (onUpdateTopic) {
                      if (editingItem.type === 'module') {
                        onUpdateTopic(editingItem.item);
                      } else {
                        const module = { ...allModules.find(m => (m.steps || []).some((s: any) => s.id === editingItem.item.id)) };
                        if (module) {
                          if (!module.grammarData) {
                            module.grammarData = {
                              title: module.title,
                              subtitle: module.description,
                              content: (module.steps || []).map((s: any) => ({ title: s.title, text: "Lesson content coming soon.", keyPoints: [], examples: [] }))
                            };
                          }

                          const newSteps = (module.steps || []).map((s: any) => s.id === editingItem.item.id ? editingItem.item : s);
                          const newGrammarData = { ...module.grammarData };
                          if (newGrammarData.content && newGrammarData.content[editingItem.item.pageIdx]) {
                            newGrammarData.content[editingItem.item.pageIdx].title = editingItem.item.title;
                          }
                          onUpdateTopic({ ...module, steps: newSteps, grammarData: newGrammarData });
                        }
                      }
                    }
                    setEditingItem(null);
                  }}
                  className="w-full mt-4 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl transition-all active:scale-95 text-sm uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Check size={18} />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

let startIdx = code.indexOf('export function GrammarTopics');
if (startIdx !== -1) {
  code = code.substring(0, startIdx) + replacement;
  fs.writeFileSync('src/components/LessonRoadmap.tsx', code);
  console.log('Fixed LessonRoadmap.tsx');
} else {
  console.log('Could not find GrammarTopics');
}
