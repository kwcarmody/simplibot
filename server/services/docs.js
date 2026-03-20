const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', '..', 'docs');
const ignoredFiles = new Set(['README.md']);

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function listDocs() {
  return fs
    .readdirSync(docsDir)
    .filter((file) => file.endsWith('.md') && !ignoredFiles.has(file))
    .sort()
    .map((file) => {
      const slug = file.replace(/\.md$/i, '');
      return {
        slug,
        file,
        title: slug
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
      };
    });
}

function renderMarkdown(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let inList = false;
  let inCode = false;
  let codeBuffer = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  const closeCode = () => {
    if (inCode) {
      html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
      codeBuffer = [];
      inCode = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushParagraph();
      closeList();
      if (inCode) {
        closeCode();
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${escapeHtml(headingMatch[2])}</h${level}>`);
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(bulletMatch[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  closeCode();

  return html.join('\n');
}

function getDocsLandingDocument() {
  const readmePath = path.join(docsDir, 'README.md');
  const content = fs.readFileSync(readmePath, 'utf8');
  return {
    slug: 'overview',
    title: 'Docs Overview',
    content,
    html: renderMarkdown(content),
  };
}

function getDocBySlug(slug) {
  const entry = listDocs().find((doc) => doc.slug === slug);
  if (!entry) {
    return null;
  }

  const content = fs.readFileSync(path.join(docsDir, entry.file), 'utf8');
  return {
    ...entry,
    content,
    html: renderMarkdown(content),
  };
}

module.exports = {
  getDocBySlug,
  getDocsLandingDocument,
  listDocs,
  renderMarkdown,
};
