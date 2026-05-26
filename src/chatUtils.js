// Shared chat utilities used by both AIChatPanel (desktop) and linglong-mobile (mobile)

export const tryParseAction = (text) => {
  // Try exact JSON first
  try { const parsed = JSON.parse(text); if (parsed.action) return parsed; } catch {}
  // Try JSON in markdown code fence
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { const parsed = JSON.parse(fenceMatch[1]); if (parsed.action) return parsed; } catch {}
  }
  // Try JSON object anywhere in text
  const jsonMatch = text.match(/\{[\s\S]*"action"[\s\S]*\}/);
  if (jsonMatch) {
    try { const parsed = JSON.parse(jsonMatch[0]); if (parsed.action) return parsed; } catch {}
  }
  return null;
};

const parseMarkdownTable = (lines, startIdx) => {
  const rows = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
    rows.push(lines[i].trim());
    i++;
  }
  if (rows.length < 2) return null;

  const tokenize = (row) =>
    row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  const headerCells = tokenize(rows[0]);
  const sepCells = tokenize(rows[1]);
  if (!sepCells.every(c => /^:?-+:?$/.test(c))) return null;

  const align = sepCells.map(c => {
    if (c.startsWith(':') && c.endsWith(':')) return 'center';
    if (c.endsWith(':')) return 'right';
    return 'left';
  });

  const dataRows = rows.slice(2).map(tokenize).filter(r => r.length === headerCells.length);

  let html = '<table class="w-full table-auto text-xs border-collapse rounded-lg overflow-hidden shadow-sm mb-2"><thead><tr class="bg-indigo-50">';
  headerCells.forEach((cell) => {
    html += `<th class="border border-slate-200 px-2.5 py-1.5 text-left font-bold text-slate-600">${cell}</th>`;
  });
  html += '</tr></thead><tbody>';

  dataRows.forEach((row) => {
    html += '<tr class="even:bg-slate-50 hover:bg-indigo-50/50 transition-colors">';
    row.forEach((cell, j) => {
      html += `<td class="border border-slate-200 px-2.5 py-1.5 text-${align[j]} text-slate-700">${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  return { html, consumed: i - startIdx };
};

export const renderMarkdown = (text) => {
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  const output = [];
  let i = 0;

  const inlineFormat = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-800">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-200 px-1 py-0.5 rounded text-xs text-indigo-600">$1</code>');

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Blank line
    if (trimmed === '') { i++; continue; }

    // Table (must check before other patterns)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const table = parseMarkdownTable(lines, i);
      if (table) { output.push(table.html); i += table.consumed; continue; }
    }

    // Header
    const hMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      const lv = hMatch[1].length;
      const sz = {1:'text-base',2:'text-sm',3:'text-xs',4:'text-[11px]'}[lv];
      output.push(`<h${lv} class="font-black text-slate-800 ${sz} mt-3 mb-1">${inlineFormat(hMatch[2])}</h${lv}>`);
      i++; continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      output.push('<hr class="my-3 border-slate-200" />');
      i++; continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      let bq = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        bq.push(lines[i].trim().replace(/^>\s*/, '')); i++;
      }
      output.push(`<blockquote class="border-l-[3px] border-indigo-300 bg-indigo-50/60 rounded-r-lg pl-4 pr-3 py-2.5 my-2 text-xs text-slate-600">${bq.map(inlineFormat).join('<br/>')}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(trimmed)) {
      let items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, '')); i++;
      }
      output.push(`<ul class="list-disc pl-5 my-2 space-y-0.5">${items.map(it => `<li class="text-xs text-slate-600 pl-1">${inlineFormat(it)}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      let items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++;
      }
      output.push(`<ol class="list-decimal pl-5 my-2 space-y-0.5">${items.map(it => `<li class="text-xs text-slate-600 pl-1">${inlineFormat(it)}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph
    let pLines = [];
    while (i < lines.length && lines[i].trim() !== '' &&
           !lines[i].trim().startsWith('#') &&
           !lines[i].trim().startsWith('|') &&
           !lines[i].trim().startsWith('> ') &&
           !/^[-*_]{3,}$/.test(lines[i].trim()) &&
           !/^[-*]\s/.test(lines[i].trim()) &&
           !/^\d+\.\s/.test(lines[i].trim())) {
      pLines.push(lines[i]); i++;
    }
    if (pLines.length > 0) {
      output.push(`<p class="text-xs text-slate-600 leading-relaxed my-1">${pLines.map(inlineFormat).join('<br/>')}</p>`);
    }
  }

  return output.join('');
};
