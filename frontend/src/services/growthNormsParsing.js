function decodePossiblyCp1251(arrayBuffer) {
  // Большинство выгрузок с весов/Excel в РФ часто идут в Windows-1251.
  const tryDecoders = ['windows-1251', 'utf-8'];

  for (const encoding of tryDecoders) {
    try {
      // TextDecoder в современных браузерах поддерживает windows-1251.
      const text = new TextDecoder(encoding, { fatal: false }).decode(arrayBuffer);
      // Простая эвристика: если в тексте слишком много replacement char, пробуем следующий.
      const badChars = (text.match(/\uFFFD/g) || []).length;
      if (badChars < 5) return text;
    } catch {
      // ignore and try next
    }
  }

  // Фолбэк: как есть
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
  // Для данных с весов обычно ';'
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

  // dd.mm.yy -> 20yy (эвристика)
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
  // Пытаемся найти "Средний [Гр]" или "Средняя" и число рядом.
  // Примеры строк часто выглядят как: "Средний [Гр]:;1108.000"
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
    // В типичной выгрузке вес в граммах — 4-я колонка (индекс 3)
    // Но пробуем собрать любые похожие числа из строки и взять наиболее правдоподобные.
    for (const p of parts) {
      const num = parseNumberMaybe(p);
      if (num != null && num > 0 && num < 100000) {
        numbers.push(num);
      }
    }
  }

  // Сырые выгрузки содержат и CV/Uniformity/StdDev, они тоже числа.
  // Чтобы не смешивать, попробуем взять модально близкий диапазон "весов": > 100 и < 10000.
  const weightCandidates = numbers.filter((n) => n >= 100 && n <= 10000);
  const arr = weightCandidates.length >= 10 ? weightCandidates : numbers;
  if (!arr.length) return null;

  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
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
  const sources = [];

  for (const file of files) {
    const lower = String(file.name || '').toLowerCase();
    const buf = await file.arrayBuffer();

    let text;
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buf, { type: 'array' });
      const firstSheetName = workbook.SheetNames?.[0];
      if (!firstSheetName) {
        throw new Error(`Пустой Excel-файл: ${file.name}`);
      }
      const sheet = workbook.Sheets[firstSheetName];
      // Преобразуем в CSV и дальше используем общий парсер
      text = XLSX.utils.sheet_to_csv(sheet, { FS: ';' });
    } else {
      text = decodePossiblyCp1251(buf);
    }

    // 1) Пробуем формат "2 колонки" (day/date;gram)
    const twoCol = parseTwoColumnNorms(text);
    if (twoCol) {
      if (twoCol.byDate) Object.assign(byDate, twoCol.byDate);
      sources.push({ fileName: file.name, parsedAs: 'two-column' });
      // byDay здесь возвращаем наверх отдельно
      continue;
    }

    // 2) Формат выгрузки с весов: одна дата + средний вес
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

  // если были two-column с byDay — возьмём их из последнего успешно распознанного
  // (для "scale-export" byDay не нужен, там byDate)
  let byDay;
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const text = decodePossiblyCp1251(buf);
    const twoCol = parseTwoColumnNorms(text);
    if (twoCol && twoCol.byDay) {
      byDay = { ...(byDay || {}), ...twoCol.byDay };
    }
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
