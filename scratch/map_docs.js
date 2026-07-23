const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
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

const docsFiles = getAllFiles('docs');
const mapping = [];

docsFiles.forEach(f => {
  const rel = f.replace(/\\/g, '/');
  const baseName = path.basename(rel);
  let target = null;
  let reason = '';

  if (rel === 'docs/CAP-v1.0-Architecture.md') {
    target = 'docs2/Platform/Architecture/CAP-v1.0-Architecture.md';
  } else if (rel.startsWith('docs/CAP_Core_Engineering_Standards_v1/docs/standards/')) {
    if (baseName.startsWith('AG-')) {
      target = `docs2/Governance/AG/${baseName}`;
    } else if (baseName.startsWith('ES-')) {
      target = `docs2/Governance/ES/${baseName}`;
    } else {
      target = `docs2/Governance/ES/${baseName}`;
    }
  } else if (rel === 'docs/CAP_Core_Engineering_Standards_v1/README.md') {
    target = 'docs2/Governance/README.md';
  } else if (rel.startsWith('docs/prompts/')) {
    if (rel.includes('ES-009')) target = 'docs2/Governance/ES/ES-009-Data-Ownership-Persistence-Standard.md';
    else if (rel.includes('ES-010')) target = 'docs2/Governance/ES/ES-010-Platform-Naming-Namespace-Standard.md';
    else if (rel.includes('DDS-101A')) target = 'docs2/Platform-Engines/VS08/Architecture/DDS-101A-Database-Design-Specification.md';
    else if (rel.includes('EWP-001-PlatformApplication')) target = 'docs2/Platform-Engines/VS08/Engineering-Work-Packages/EWP-001-PlatformApplication.md';
    else target = `docs2/AI-Engineering/Prompt-Library/${baseName}`;
  } else if (rel.startsWith('docs/VS06/')) {
    if (rel.includes('/standards/')) target = `docs2/Platform-Engines/VS06/Standards/${baseName}`;
    else target = `docs2/Platform-Engines/VS06/${baseName}`;
  } else if (rel.startsWith('docs/VS07/')) {
    if (rel.includes('/foundation/')) target = `docs2/Platform-Engines/VS07/Foundation/${baseName}`;
    else if (rel.includes('/releases/')) target = `docs2/Platform-Engines/VS07/Releases/${baseName}`;
    else if (rel.includes('/standards/')) target = `docs2/Platform-Engines/VS07/Standards/${baseName}`;
    else target = `docs2/Platform-Engines/VS07/${baseName}`;
  } else if (rel.startsWith('docs/VS08/')) {
    if (rel.includes('/adr/')) target = `docs2/Platform-Engines/VS08/ADR/${baseName}`;
    else if (rel.includes('/capability-contracts/')) target = `docs2/Platform-Engines/VS08/Capability-Contracts/${baseName}`;
    else if (rel.includes('/engineering-work-packages/')) target = `docs2/Platform-Engines/VS08/Engineering-Work-Packages/${baseName}`;
    else if (rel.includes('/foundation/')) target = `docs2/Platform-Engines/VS08/Foundation/${baseName}`;
    else target = `docs2/Platform-Engines/VS08/${baseName}`;
  } else if (rel.startsWith('docs/VS08B/')) {
    if (rel.includes('/adr/')) target = `docs2/Platform-Engines/VS08/ADR/${baseName}`;
    else if (rel.includes('/architecture/')) target = `docs2/Platform-Engines/VS08/Architecture/${baseName}`;
    else if (rel.includes('/blueprint/')) target = `docs2/Platform-Engines/VS08/Blueprint/${baseName}`;
    else if (rel.includes('/capability-contracts/')) target = `docs2/Platform-Engines/VS08/Capability-Contracts/${baseName}`;
    else if (rel.includes('/certification/')) target = `docs2/Platform-Engines/VS08/Certification/${baseName}`;
    else if (rel.includes('/engineering-work-packages/')) target = `docs2/Platform-Engines/VS08/Engineering-Work-Packages/${baseName}`;
    else if (rel.includes('/reviews/')) target = `docs2/Platform-Engines/VS08/Reviews/${baseName}`;
    else if (rel.includes('DM-001')) target = `docs2/Platform-Engines/VS08/Domain/${baseName}`;
    else if (rel.includes('Bootstrap')) target = `docs2/Platform-Engines/VS08/Foundation/${baseName}`;
    else target = `docs2/Platform-Engines/VS08/${baseName}`;
  } else if (rel.startsWith('docs/VS09/')) {
    if (rel.includes('/adr/')) target = `docs2/Platform-Engines/VS09/ADR/${baseName}`;
    else if (rel.includes('/capability-contracts/')) target = `docs2/Platform-Engines/VS09/Capability-Contracts/${baseName}`;
    else if (rel.includes('/certification/')) {
      if (baseName.startsWith('AFR-')) target = `docs2/Platform-Engines/VS09/AFR/${baseName}`;
      else if (baseName.startsWith('CFR-')) target = `docs2/Platform-Engines/VS09/CFR/${baseName}`;
      else target = `docs2/Platform-Engines/VS09/Certification/${baseName}`;
    } else if (rel.includes('/work-packages/')) target = `docs2/Platform-Engines/VS09/Engineering-Work-Packages/${baseName}`;
    else if (rel.includes('/EWP-')) {
      const ewpSub = rel.split('/')[2];
      target = `docs2/Platform-Engines/VS09/Engineering-Work-Packages/${ewpSub}/${baseName}`;
    } else if (rel.includes('/HF-')) {
      const hfSub = rel.split('/')[2];
      target = `docs2/Platform-Engines/VS09/Reference-Implementations/HF/${hfSub}/${baseName}`;
    } else if (baseName.startsWith('VS09-P001')) target = `docs2/Platform-Engines/VS09/Blueprint/${baseName}`;
    else if (baseName.startsWith('VS09-P002')) target = `docs2/Platform-Engines/VS09/Architecture/${baseName}`;
    else if (baseName.startsWith('VS09-P003')) target = `docs2/Platform-Engines/VS09/Domain/${baseName}`;
    else if (baseName === 'ENGINE-INDEX.md') target = 'docs2/Platform-Engines/VS09/ENGINE-INDEX.md';
    else if (baseName === 'RIS-REGISTRY.md') target = 'docs2/Platform-Engines/VS09/RIS-REGISTRY.md';
    else if (baseName === 'CHANGELOG.md') target = 'docs2/Platform-Engines/VS09/CHANGELOG.md';
    else target = `docs2/Platform-Engines/VS09/${baseName}`;
  } else if (rel === 'docs/00-Bootstrap-Prompt.md' || rel === 'docs/Bootstrap-Prompt.md' || rel === 'docs/00-Bootstrap-Prompt2.md' || rel === 'docs/Bootstrap-Prompt2.md') {
    target = `docs2/Platform/Bootstrap/${baseName}`;
  } else if (rel === 'docs/ENGINES.md') {
    target = 'docs2/ENGINES.md';
  } else if (rel === 'docs/PLATFORM_STATUS.md') {
    target = 'docs2/PLATFORM_STATUS.md';
  } else if (rel === 'docs/Engineering-Library-Structure.xml' || rel === 'docs/docs_tree.xml') {
    target = `docs2/_UNCLASSIFIED/${baseName}`;
    reason = 'XML structure definition metadata file';
  }

  if (!target) {
    target = `docs2/_UNCLASSIFIED/${baseName}`;
    reason = 'No explicit category rule matched';
  }

  mapping.push({ src: rel, dest: target, reason });
});

console.log(`Unclassified count: ${mapping.filter(m => m.dest.includes('_UNCLASSIFIED')).length}`);
mapping.filter(m => m.dest.includes('_UNCLASSIFIED')).forEach(m => console.log(`UNCLASSIFIED: ${m.src} -> ${m.dest} (${m.reason})`));
