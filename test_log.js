const fs = require('fs');
let content = fs.readFileSync('src/pages/__tests__/Room.test.tsx', 'utf8');
content = content.replace(/if \(query === "rooms.getRoom"\) return null;/, 'console.log("query:", query, typeof query); if (query === "rooms.getRoom") return null;');
fs.writeFileSync('src/pages/__tests__/Room.test.tsx', content);
