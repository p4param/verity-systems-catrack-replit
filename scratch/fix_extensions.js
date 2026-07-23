const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles('docs2');
const renamedFiles = [];

allFiles.forEach(filePath => {
  const ext = path.extname(filePath).toLowerCase();
  
  // Skip files that already have extensions (.md, .xml, .json, etc.)
  if (ext === '.md' || ext === '.xml' || ext === '.json' || ext === '.txt') {
    return;
  }

  // If file does not have .md extension, check if it's markdown text or lacks extension
  const newPath = `${filePath}.md`;

  console.log(`Renaming: "${filePath}" -> "${newPath}"`);
  fs.renameSync(filePath, newPath);
  renamedFiles.push({ oldPath: filePath, newPath: newPath });
});

console.log(`Total files renamed to include .md extension: ${renamedFiles.length}`);
