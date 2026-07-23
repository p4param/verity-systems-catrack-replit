const fs = require('fs');
const path = require('path');

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function buildXmlTree(dirPath, indentLevel = 1) {
  const indent = '  '.repeat(indentLevel);
  const dirName = path.basename(dirPath);
  const normalizedPath = dirPath.replace(/\\/g, '/');
  
  let xml = `${indent}<directory name="${escapeXml(dirName)}" path="${escapeXml(normalizedPath)}">\n`;

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  // Sort directories first, then files
  items.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);
    const itemNormalizedPath = itemPath.replace(/\\/g, '/');
    if (item.isDirectory()) {
      xml += buildXmlTree(itemPath, indentLevel + 1);
    } else if (item.isFile()) {
      const fileIndent = '  '.repeat(indentLevel + 1);
      xml += `${fileIndent}<file name="${escapeXml(item.name)}" path="${escapeXml(itemNormalizedPath)}"/>\n`;
    }
  }

  xml += `${indent}</directory>\n`;
  return xml;
}

const header = `<?xml version='1.0' encoding='UTF-8'?>\n<engineeringLibraryStructure generatedBy="Antigravity AI" version="1.0">\n`;
const body = buildXmlTree('docs2', 1);
const footer = `</engineeringLibraryStructure>\n`;

const fullXml = header + body + footer;

const outputPath = 'docs2/Archive/Migration/docs2_tree.xml';
fs.writeFileSync(outputPath, fullXml, 'utf8');
console.log(`XML file generated successfully at ${outputPath}`);
console.log(`Total XML lines: ${fullXml.split('\n').length}`);
