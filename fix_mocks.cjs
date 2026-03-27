const fs = require('fs');
let content = fs.readFileSync('src/pages/__tests__/Room.test.tsx', 'utf8');

// Replace (query) => 
content = content.replace(/mockImplementation\(\(query\) => \{/g, 'mockImplementation((...argsArray: any[]) => {\n      const query = argsArray[0];');

// Replace (query, args) =>
content = content.replace(/mockImplementation\(\(query, args\) => \{/g, 'mockImplementation((...argsArray: any[]) => {\n        const query = argsArray[0];\n        const args = argsArray[1];');

fs.writeFileSync('src/pages/__tests__/Room.test.tsx', content);
