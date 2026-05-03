const fs = require('fs');

const files = [
  'src/components/LessonRoadmap.tsx',
  'src/components/GrammarExplanation.tsx',
  'src/components/Lesson.tsx',
];

const replacements = [
  // Backgrounds
  { search: /bg-white dark:bg-slate-900/g, replace: 'bg-[#0e121b]' },
  { search: /bg-white dark:bg-slate-950/g, replace: 'bg-white dark:bg-[#0e121b]' },
  { search: /bg-slate-50 dark:bg-slate-950/g, replace: 'bg-slate-50 dark:bg-[#0e121b]' },
  { search: /bg-slate-50 dark:bg-slate-900\/50/g, replace: 'bg-slate-50 dark:bg-[#131b2c]' },
  { search: /bg-slate-50 dark:bg-slate-900/g, replace: 'bg-slate-50 dark:bg-[#0e121b]' },
  { search: /bg-slate-100 dark:bg-slate-800/g, replace: 'bg-slate-100 dark:bg-[#131b2c]' },
  { search: /bg-slate-200 dark:bg-slate-800/g, replace: 'bg-slate-200 dark:bg-[#212b43]' },
  { search: /bg-slate-50 dark:bg-slate-800\/50/g, replace: 'bg-slate-50 dark:bg-[#131b2c]' },
  { search: /bg-slate-50 dark:bg-slate-800\/40/g, replace: 'bg-slate-50 dark:bg-[#131b2c]\/40' },
  { search: /bg-slate-50 dark:bg-slate-800/g, replace: 'bg-slate-50 dark:bg-[#131b2c]' },
  { search: /dark:bg-slate-800/g, replace: 'dark:bg-[#131b2c]' },
  { search: /dark:bg-slate-900\/50/g, replace: 'dark:bg-[#0e121b]\/80' },
  { search: /dark:bg-slate-900/g, replace: 'dark:bg-[#0e121b]' },
  
  // Borders
  { search: /border-slate-100 dark:border-slate-800\/80/g, replace: 'border-slate-100 dark:border-[#212b43]\/80' },
  { search: /border-slate-100 dark:border-slate-800/g, replace: 'border-slate-100 dark:border-[#212b43]' },
  { search: /border-slate-200 dark:border-slate-800\/50/g, replace: 'border-slate-200 dark:border-[#212b43]\/50' },
  { search: /border-slate-200 dark:border-slate-800/g, replace: 'border-slate-200 dark:border-[#212b43]' },
  { search: /border-slate-200 dark:border-slate-700/g, replace: 'border-slate-200 dark:border-[#212b43]' },
  { search: /border-slate-100 dark:border-slate-700/g, replace: 'border-slate-100 dark:border-[#212b43]' },
  { search: /dark:border-slate-800/g, replace: 'dark:border-[#212b43]' },
  { search: /dark:border-slate-700/g, replace: 'dark:border-[#212b43]' },
  { search: /dark:border-\[\#0f172a\]/g, replace: 'dark:border-[#0e121b]' },
  
  // Texts
  { search: /text-slate-800 dark:text-slate-100/g, replace: 'text-slate-800 dark:text-white' },
  { search: /text-slate-500 dark:text-slate-400/g, replace: 'text-slate-500 dark:text-[#a0aab8]' },
  { search: /text-slate-400 dark:text-slate-500/g, replace: 'text-slate-400 dark:text-[#7a86a1]' },
  { search: /text-slate-700 dark:text-slate-300/g, replace: 'text-slate-700 dark:text-[#c4cbd4]' },
  { search: /text-slate-700 dark:text-slate-200/g, replace: 'text-slate-700 dark:text-white' },
  { search: /text-slate-600 dark:text-slate-400/g, replace: 'text-slate-600 dark:text-[#a0aab8]' },
  { search: /text-slate-600 dark:text-slate-300/g, replace: 'text-slate-600 dark:text-[#c4cbd4]' },
  { search: /dark:text-slate-400/g, replace: 'dark:text-[#a0aab8]' },
  { search: /dark:text-slate-500/g, replace: 'dark:text-[#7a86a1]' },
  { search: /dark:text-slate-300/g, replace: 'dark:text-[#c4cbd4]' },
  
  // Indigo (Primary) Theme Colors
  { search: /bg-indigo-500/g, replace: 'bg-[#6e5aff]' },
  { search: /text-indigo-500/g, replace: 'text-[#6e5aff]' },
  { search: /text-indigo-600 dark:text-indigo-400/g, replace: 'text-indigo-600 dark:text-[#8b79ff]' },
  { search: /dark:text-indigo-400/g, replace: 'dark:text-[#8b79ff]' },
  { search: /focus:border-indigo-500/g, replace: 'focus:border-[#6e5aff]' },
  { search: /shadow-indigo-500\/20/g, replace: 'shadow-[#6e5aff]\/20' },
  { search: /shadow-indigo-200/g, replace: 'shadow-[#6e5aff]\/20' },
  
  // Fixes for existing matches with both dark and light
  { search: /bg-indigo-100 dark:bg-indigo-900\/40/g, replace: 'bg-indigo-100 dark:bg-[#6e5aff]\/20' },
  { search: /bg-indigo-100 dark:bg-indigo-900\/30/g, replace: 'bg-indigo-100 dark:bg-[#6e5aff]\/20' },
  { search: /dark:bg-indigo-900\/40/g, replace: 'dark:bg-[#6e5aff]\/20' },
  { search: /dark:border-indigo-900\/50/g, replace: 'dark:border-[#6e5aff]\/30' },
  { search: /dark:border-indigo-800/g, replace: 'dark:border-[#6e5aff]\/30' },
  { search: /dark:border-indigo-600/g, replace: 'dark:border-[#8b79ff]' },
  { search: /dark:border-indigo-400/g, replace: 'dark:border-[#8b79ff]' },
  { search: /bg-indigo-50 dark:bg-indigo-900\/30/g, replace: 'bg-indigo-50 dark:bg-[#6e5aff]\/10' },
  { search: /bg-indigo-50 dark:bg-indigo-900\/20/g, replace: 'bg-indigo-50 dark:bg-[#6e5aff]\/10' },
  { search: /bg-indigo-50 dark:bg-indigo-900\/40/g, replace: 'bg-indigo-50 dark:bg-[#6e5aff]\/10' },
  { search: /bg-indigo-50\/50 dark:bg-indigo-500\/5/g, replace: 'bg-indigo-50\/50 dark:bg-[#6e5aff]\/5' },
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    for (const {search, replace} of replacements) {
      code = code.replace(search, replace);
    }
    fs.writeFileSync(file, code);
    console.log(`Updated ${file}`);
  }
}
