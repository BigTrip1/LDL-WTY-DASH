/**
 * Tiny markdown → HTML renderer for trusted in-repo docs.
 * Handles: headings (#…####), paragraphs, ul/ol lists, code spans, code fences
 * (```), bold/italic, blockquotes, horizontal rules, tables, autolinks.
 * Not a general-purpose renderer.
 *
 * SECURITY: input is assumed trusted (in-repo markdown). We escape HTML for
 * everything except the final tags we emit ourselves. Output is injected via
 * `dangerouslySetInnerHTML` by the caller.
 */

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch] as string));
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return out;
}

function tableHtml(lines: string[]): string {
  const cells = (l: string) => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const head = cells(lines[0]);
  const body = lines.slice(2).map(cells);
  const th = head.map(h => `<th>${inline(h)}</th>`).join('');
  const trs = body.map(row => `<tr>${row.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="overflow-auto"><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  // Hard cap on iterations as a defence against any future grammar bug that
  // could prevent `i` from advancing.
  const maxIter = lines.length * 4 + 1000;
  let iter = 0;
  while (i < lines.length) {
    if (++iter > maxIter) {
      out.push('<p><em>(markdown render aborted: too many iterations)</em></p>');
      break;
    }
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m: RegExpMatchArray | null;

    // Fenced code block: ```lang ... ```
    if ((m = line.match(/^```\s*([a-zA-Z0-9_-]*)\s*$/))) {
      const lang = m[1] || '';
      i++;
      const buf: string[] = [];
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      const n = m[1].length;
      out.push(`<h${n}>${inline(m[2])}</h${n}>`);
      i++; continue;
    }
    if (/^---+\s*$/.test(line)) { out.push('<hr />'); i++; continue; }

    // Table: requires a `|---|` divider on the next line. Anything else that
    // happens to start with `|` (e.g. ASCII art) is treated as a paragraph.
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|/.test(lines[i + 1])) {
      const tbl: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) { tbl.push(lines[i]); i++; }
      out.push(tableHtml(tbl));
      continue;
    }
    if (line.startsWith('> ')) {
      const block: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i].startsWith('>'))) {
        block.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${block.map(b => inline(b)).join('<br />')}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push(`<ul>${items.map(it => `<li>${inline(it)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      out.push(`<ol>${items.map(it => `<li>${inline(it)}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph fallback. We collect contiguous non-empty lines that aren't
    // the start of any other block construct. Critical: we always advance
    // `i` by at least one even if the line looks like it could be a table
    // marker - that's how we avoid the infinite-loop crash on ASCII art
    // diagrams that start with `|`.
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !(lines[i].startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|/.test(lines[i + 1])) &&
      !lines[i].startsWith('>') &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
