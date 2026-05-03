const fs = require('fs');

const files = [
  'src/components/LessonRoadmap.tsx',
  'src/components/GrammarExplanation.tsx',
  'src/components/Lesson.tsx',
];

const replacements = [
  { search: /dark:hover:bg-slate-700\/50/g, replace: 'dark:hover:bg-[#1a2336]' },
  { search: /dark:hover:bg-slate-700/g, replace: 'dark:hover:bg-[#1a2336]' },
  { search: /dark:hover:bg-slate-800\/50/g, replace: 'dark:hover:bg-[#131b2c]' },
  { search: /dark:bg-slate-800\/40/g, replace: 'dark:bg-[#131b2c]' },
  { search: /dark:bg-slate-800\/50/g, replace: 'dark:bg-[#131b2c]' },
  { search: /dark:border-slate-800\/80/g, replace: 'dark:border-[#212b43]' },
  { search: /text-zinc-700/g, replace: 'text-slate-700' }
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
