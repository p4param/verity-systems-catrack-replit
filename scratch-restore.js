const fs = require('fs');

const originalContent = fs.readFileSync('restore.txt', 'utf-16le');
const targetContent = fs.readFileSync('src/app/(dashboard)/settings/platform/entities/components/field-dialog.tsx', 'utf-8');

// Find where FieldDialog ends
const searchToken = 'function FieldOptionsManager(';
const startIdx = originalContent.indexOf(searchToken);

if (startIdx !== -1) {
  const componentsToAppend = '\n\n' + originalContent.slice(startIdx);
  fs.writeFileSync('src/app/(dashboard)/settings/platform/entities/components/field-dialog.tsx', targetContent + componentsToAppend, 'utf-8');
  console.log('Successfully appended missing components.');
} else {
  console.error('Could not find FieldOptionsManager in restore.txt');
}
