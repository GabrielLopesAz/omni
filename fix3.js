const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'backend/test');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.e2e-spec.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const beforeAllRegex = /(beforeAll\(\s*async\s*\(\)\s*=>\s*\{)/g;
  
  if (!content.includes('process.env.NODE_ENV !== ')) {
    content = content.replace(beforeAllRegex, 
      "$1\n    if (process.env.NODE_ENV !== 'test') throw new Error('FAIL-FAST: NODE_ENV must be test');\n    if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('test')) throw new Error('FAIL-FAST: DB_NAME must end with test');\n"
    );
    fs.writeFileSync(filePath, content);
    console.log('Added fail-fast to', file);
  }
}
