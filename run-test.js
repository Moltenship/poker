import fs from 'fs';
const content = fs.readFileSync('src/pages/__tests__/Room.test.tsx', 'utf8');
const modified = content.replace(/const queryName = getQueryName\(fn\);/g, 'console.log("FN IS:", typeof fn, Object.keys(fn), fn.isQuery, fn.isAction); const queryName = "none";');
fs.writeFileSync('src/pages/__tests__/Room.test.tsx', modified);
