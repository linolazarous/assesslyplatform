// check-proptypes-imports.js
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('./src'); // Adjust if your source folder is different

function walkDir(dir, fileCallback) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileCallback);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      fileCallback(fullPath);
    }
  });
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const usesPropTypes = content.includes('.propTypes');
  const importsPropTypes = /import\s+PropTypes\s+from\s+['"]prop-types['"]/m.test(content);

  if (usesPropTypes && !importsPropTypes) {
    console.log(`⚠️ Missing PropTypes import in: ${filePath}`);
  }
}

walkDir(SRC_DIR, checkFile);
console.log('✅ Scan complete');
