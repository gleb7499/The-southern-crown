function decodePossiblyCp1251(arrayBuffer) {
  // Most weight-scale/Excel exports in the RF often come in Windows-1251.
  const tryDecoders = ['windows-1251', 'utf-8'];

  for (const encoding of tryDecoders) {
    try {
      // TextDecoder in modern browsers supports windows-1251.
      const text = new TextDecoder(encoding, { fatal: false }).decode(arrayBuffer);
      // Simple heuristic: if the text has too many replacement chars, try the next one.
      const badChars = (text.match(/\uFFFD/g) || []).length;
      if (badChars < 5) return text;
    } catch {
      // ignore and try next
    }
  }

  // Fallback: as is
  return new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
}

function parseNumberMaybe(value) {
  if (value == null) return null;
  const s = String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.');
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

function detectDelimiter(text) {
  const semicolons = (text.match(/;/g) || []).length;
  const commas = (text.match(/,/g) || []).length;
  // For weight-scale data usually ';'
  return semicolons >= commas ? ';' : ',';
}

function extractDateFromFilename(fileName) {
  const name = String(fileName || '');

  // dd.mm.yyyy
  const m4 = name.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (m4) {
    const dd = m4[1];
    const mm = m4[2];
    const yyyy = m4[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // dd.mm.yy -> 20yy (heuristic)
  const m2 = name.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  if (m2) {
    const dd = m2[1];
    const mm = m2[2];
    const yy = m2[3];
    const yyyy = Number(yy) >= 70 ? `19${yy}` : `20${yy}`;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function extractAverageFromHeader(text) {
  // We try to find "Средний [Гр]" or "Средняя" and a nearby number.
  // Example lines often look like: "Средний [Гр]:;1108.000"
  const patterns = [
    /Средн\S*\s*\[[^\]]*\]\s*[:;]\s*([0-9\s.,]+)/i,
    /Средн\S*\s*[:;]\s*([0-9\s.,]+)/i,
    /Average\s*\[[^\]]*\]\s*[:;]\s*([0-9\s.,]+)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const num = parseNumberMaybe(m[1]);
      if (num != null) return num;
    }
  }

  return null;
}

function computeAverageFromTable(text) {
  const delimiter = detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const numbers = [];
  for (const line of lines) {
    const parts = line.split(delimiter).map((p) => p.trim());
    // In a typical export the weight in grams is the 4th column (index 3)
    // But we try to collect any similar numbers from the line and take the most plausible ones.
    for (const p of parts) {
      const num = parseNumberMaybe(p);
      if (num != null && num > 0 && num < 100000) {
        numbers.push(num);
      }
    }
  }

  // Raw exports also contain CV/Uniformity/StdDev, which are also numbers.
  // To avoid mixing them, we try to take the modal "weight" range: > 100 and < 10000.
  const weightCandidates = numbers.filter((n) => n >= 100 && n <= 10000);
  const arr = weightCandidates.length >= 10 ? weightCandidates : numbers;
  if (!arr.length) return null;

  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function parseGrowthNormsTable(rows) {
  // New format: a table with columns [day, среднесуточный_привес, живая_масса_г, ...]
  // We find the header row containing "Средне-суточный" or "Живая масса"
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    const rowStr = row.map((c) => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('живая масса') || rowStr.includes('средне-суточный')) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return null;

  // Skip additional header rows (column numbering, units of measurement)
  let dataStartIdx = headerIdx + 1;
  // Usually after the main header comes a row with column numbers ("1","2","3"...) and a row with units ("дни","гр","гр"...)
  while (dataStartIdx < rows.length) {
    const row = rows[dataStartIdx] || [];
    const first = String(row[0] || '').trim().toLowerCase();
    // If the first cell is "дни", "день", or a number like "1","2","3" (column number) — skip it
    if (first === 'дни' || first === 'день' || /^[1-9]$/.test(first)) {
      dataStartIdx++;
    } else {
      break;
    }
  }

  const byDay = {};
  for (let i = dataStartIdx; i < rows.length; i++) {
    const row = rows[i] || [];
    const dayCell = row[0];
    const weightCell = row[2]; // колонка "Живая масса, г"

    const day = parseNumberMaybe(dayCell);
    const weight = parseNumberMaybe(weightCell);

    if (day != null && weight != null && day >= 0 && weight > 0) {
      byDay[String(Math.round(day))] = weight;
    }
  }

  if (Object.keys(byDay).length === 0) return null;
  return { byDay };
}

function parseTwoColumnNorms(text) {
  const delimiter = detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const byDay = {};
  const byDate = {};

  for (const line of lines) {
    const parts = line.split(delimiter).map((p) => p.trim());
    if (parts.length < 2) continue;

    const key = parts[0];
    const value = parseNumberMaybe(parts[1]);
    if (value == null) continue;

    // date format dd.mm.yyyy
    const m = key.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
      const dd = m[1];
      const mm = m[2];
      const yyyy = m[3];
      byDate[`${yyyy}-${mm}-${dd}`] = value;
      continue;
    }

    // ISO date yyyy-mm-dd
    const iso = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      byDate[key] = value;
      continue;
    }

    // day number
    const day = parseInt(key, 10);
    if (Number.isFinite(day) && day > 0) {
      byDay[String(day)] = value;
    }
  }

  const hasByDate = Object.keys(byDate).length > 0;
  const hasByDay = Object.keys(byDay).length > 0;

  if (!hasByDate && !hasByDay) return null;
  return { byDate: hasByDate ? byDate : undefined, byDay: hasByDay ? byDay : undefined };
}

export async function parseGrowthNormsFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) throw new Error('Файлы не выбраны');

  const byDate = {};
  let byDay = null;
  const sources = [];

  for (const file of files) {
    const lower = String(file.name || '').toLowerCase();
    const buf = await file.arrayBuffer();

    let text;
    let rows = null;
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buf, { type: 'array' });
      const firstSheetName = workbook.SheetNames?.[0];
      if (!firstSheetName) {
        throw new Error(`Пустой Excel-файл: ${file.name}`);
      }
      const sheet = workbook.Sheets[firstSheetName];
      // Get the data as an array of arrays for table parsing
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      // Also get CSV for compatibility with old formats
      text = XLSX.utils.sheet_to_csv(sheet, { FS: ';' });
    } else {
      text = decodePossiblyCp1251(buf);
    }

    // 1) Try the new format: table structure with days and live weight
    if (rows) {
      const tableFormat = parseGrowthNormsTable(rows);
      if (tableFormat && tableFormat.byDay) {
        byDay = { ...(byDay || {}), ...tableFormat.byDay };
        sources.push({ fileName: file.name, parsedAs: 'growth-table' });
        continue;
      }
    }

    // 2) Try the "2 columns" format (day/date;gram)
    const twoCol = parseTwoColumnNorms(text);
    if (twoCol) {
      if (twoCol.byDate) Object.assign(byDate, twoCol.byDate);
      if (twoCol.byDay) byDay = { ...(byDay || {}), ...twoCol.byDay };
      sources.push({ fileName: file.name, parsedAs: 'two-column' });
      continue;
    }

    // 3) Weight-scale export format: one date + average weight
    const isoDate = extractDateFromFilename(file.name);
    const avg = extractAverageFromHeader(text) ?? computeAverageFromTable(text);

    if (!isoDate) {
      throw new Error(`Не смог определить дату из имени файла: ${file.name}`);
    }
    if (avg == null) {
      throw new Error(`Не смог определить средний вес из файла: ${file.name}`);
    }

    byDate[isoDate] = avg;
    sources.push({ fileName: file.name, parsedAs: 'scale-export', date: isoDate, avgGram: avg });
  }

  if (!Object.keys(byDate).length && !byDay) {
    throw new Error('Не удалось распарсить нормы развития из файлов');
  }

  return {
    byDate: Object.keys(byDate).length ? byDate : undefined,
    byDay,
    source: {
      files: sources,
    },
  };
}
