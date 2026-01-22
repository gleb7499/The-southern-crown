import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import FiltersForm from '../components/FiltersForm';
import DateDropdownPicker from '../components/DateDropdownPicker';
import { farmsAPI } from '../services/api';
import * as XLSX from 'xlsx';

const REPORT_METRICS = [
  {
    key: 'mean_weight',
    label: 'Средний вес',
    unit: 'г',
    // Дневной средний (для текущей модели данных обычно равен gram за день)
    getValue: (point) => point?.meanDaily,
  },
  {
    key: 'std_deviation',
    label: 'Стандартное отклонение',
    unit: 'г',
    // Накопительное σ по всем измерениям до текущей даты
    getValue: (point) => point?.stdDev,
  },
  {
    key: 'uniformity',
    label: 'Однородность',
    unit: '%',
    getValue: (point) => point?.uniformity,
  },
  {
    key: 'cv',
    label: 'Коэффициент вариации',
    unit: '%',
    getValue: (point) => point?.cv,
  },
];

function getMetricByKey(metricKey) {
  return REPORT_METRICS.find((m) => m.key === metricKey) ?? REPORT_METRICS[0];
}

function toNumberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function niceStepCeil(rawStep) {
  if (typeof rawStep !== 'number' || !Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const pow10 = 10 ** exponent;
  const fraction = rawStep / pow10;

  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * pow10;
}

function getTickDecimals(step) {
  if (typeof step !== 'number' || !Number.isFinite(step)) return 0;
  if (step >= 10) return 0;
  if (step >= 1) return 1;
  return 2;
}

function formatTick(value, unit, step) {
  const decimals = getTickDecimals(step);
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
  return unit === '%' ? `${formatted}%` : `${formatted} г`;
}

function buildYAxis(values, unit, metricKey) {
  // Для процентных метрик (uniformity, cv) фиксируем шкалу 0-100%
  if (unit === '%') {
    const yMax = 100;
    const step = 25;
    const ticks = [0, 25, 50, 75, 100];
    return { yMax, ticks, step };
  }

  // Для весовых метрик динамическая шкала
  const safeValues = (values || []).filter(
    (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0
  );
  const maxValue = safeValues.length ? Math.max(...safeValues) : 0;

  const minYMax = 1;
  const targetMax = Math.max(maxValue * 1.1, minYMax);
  const rawStep = targetMax / 3;
  const step = niceStepCeil(rawStep);
  const yMax = step * 3;
  const ticks = [0, step, step * 2, step * 3];

  return { yMax, ticks, step };
}

function isValidISODateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function mean(values) {
  if (!values || values.length === 0) return null;
  const validValues = values.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (validValues.length === 0) return null;
  const sum = validValues.reduce((acc, v) => acc + v, 0);
  return sum / validValues.length;
}

// По аналогии с бэкендом: variance делим на N (популяционная дисперсия)
function stdDev(values) {
  if (!values || values.length === 0) return 0;
  const validValues = values.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (validValues.length <= 1) return 0;
  const avg = mean(validValues);
  if (avg === null || !Number.isFinite(avg)) return 0;
  const variance = validValues.reduce((acc, v) => acc + (v - avg) ** 2, 0) / validValues.length;
  return Number.isFinite(variance) && variance >= 0 ? Math.sqrt(variance) : 0;
}

function groupReportsByDate(reports) {
  const grouped = new Map();
  for (const report of reports || []) {
    const dateKey = report?.date;
    const gram = toNumberOrNull(report?.gram);
    if (!isValidISODateString(dateKey) || gram === null) continue;
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey).push(gram);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, grams]) => ({ date, grams }));
}

function buildDailyPoints(reports, targetRangePercent) {
  const safePercent =
    typeof targetRangePercent === 'number' && Number.isFinite(targetRangePercent)
      ? Math.min(Math.max(targetRangePercent, 0), 100)
      : 10;
  const p = safePercent / 100;

  const grouped = groupReportsByDate(reports);

  // Важно:
  // - В текущей БД обычно 1 Report на дату => σ внутри дня = 0.
  // - Чтобы графики σ/CV были осмысленными без изменения бэкенда,
  //   считаем их накопительно (по всем измерениям до текущей даты).
  const points = [];
  const cumulative = [];

  for (const g of grouped) {
    const dailyMean = mean(g.grams);
    if (dailyMean === null || !Number.isFinite(dailyMean)) continue;

    cumulative.push(...g.grams);

    const cumulativeMean = mean(cumulative);
    if (cumulativeMean === null || !Number.isFinite(cumulativeMean)) continue;

    const sd = stdDev(cumulative);
    // CV: защита от деления на ноль и проверка на конечность
    const cv = cumulativeMean > 0 && Number.isFinite(sd) ? (sd / cumulativeMean) * 100 : 0;

    // Однородность по формуле:
    // (кол-во птиц в целевом диапазоне / общее кол-во взвешенных птиц) * 100
    // Диапазон берём как ±X% от накопительного среднего.
    const lower = cumulativeMean * (1 - p);
    const upper = cumulativeMean * (1 + p);
    const inRange = cumulative.filter((v) => v >= lower && v <= upper).length;
    const uniformity = cumulative.length > 0 ? (inRange / cumulative.length) * 100 : 0;

    // Финальная валидация всех метрик перед добавлением в точки
    if (!Number.isFinite(cv) || !Number.isFinite(uniformity) || !Number.isFinite(sd)) {
      continue;
    }

    points.push({
      date: g.date,
      nDaily: g.grams.length,
      nCumulative: cumulative.length,
      meanDaily: dailyMean,
      meanCumulative: cumulativeMean,
      stdDev: sd,
      cv: Math.max(0, Math.min(cv, 100)), // CV ограничиваем 0-100%
      uniformity: Math.max(0, Math.min(uniformity, 100)), // Однородность ограничиваем 0-100%
    });
  }

  return points;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [selectedControlPointId, setSelectedControlPointId] = useState(null);
  const [selectedControlPointName, setSelectedControlPointName] = useState('');
  const [selectedMetricKey, setSelectedMetricKey] = useState('mean_weight');
  const [selectedDate, setSelectedDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [uniformityRangePercent, setUniformityRangePercent] = useState(10);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await farmsAPI.getFarms();
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChart = async () => {
    if (!selectedControlPointId || !selectedDate) {
      alert('Пожалуйста, выберите точку контроля и дату');
      return;
    }

    // Проверка корректности uniformityRangePercent для метрики "Однородность"
    if (selectedMetricKey === 'uniformity') {
      if (uniformityRangePercent === '' || 
          !Number.isFinite(Number(uniformityRangePercent)) || 
          Number(uniformityRangePercent) <= 0) {
        alert('Пожалуйста, укажите корректное значение для целевого диапазона (больше 0)');
        return;
      }
    }

    // Проверка, что выбранная дата не в будущем (сравниваем строки в формате YYYY-MM-DD)
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
                        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(today.getDate()).padStart(2, '0');
    if (selectedDate > todayString) {
      alert('Нельзя выбрать дату из будущего');
      return;
    }

    try {
      // Загружаем данные отчета для выбранной точки контроля
      const response = await fetch(`/api/reports/?control_point_id=${selectedControlPointId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const sortedReports = (data || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      const filteredByDate = isValidISODateString(selectedDate)
        ? sortedReports.filter((r) => isValidISODateString(r?.date) && r.date <= selectedDate)
        : sortedReports;

      setChartData({
        controlPointName: selectedControlPointName,
        reports: filteredByDate,
        date: selectedDate,
        metricKey: selectedMetricKey,
      });
    } catch (error) {
      console.error('Error loading chart data:', error);
      alert('Ошибка при загрузке данных графика');
    }
  };

  const handleExportXLSX = () => {
    if (!chartData || !chartData.reports || chartData.reports.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      const metric = getMetricByKey(chartData.metricKey);
      const safeRangePercent = 
        typeof uniformityRangePercent === 'number' && Number.isFinite(uniformityRangePercent)
          ? uniformityRangePercent
          : 10;
      const points = buildDailyPoints(chartData.reports, safeRangePercent);
      
      // Вычисляем агрегированные метрики
      const allWeights = chartData.reports.map(r => r.gram).filter(g => typeof g === 'number' && Number.isFinite(g));
      const avgWeight = mean(allWeights);
      const stdDeviation = stdDev(allWeights);
      const cv = avgWeight > 0 ? (stdDeviation / avgWeight) * 100 : 0;
      const lastPoint = points[points.length - 1];
      const uniformity = lastPoint?.uniformity ?? 0;

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      
      // Заголовок с метаданными (3 строки)
      const headerData = [
        ['Файл:', chartData.controlPointName, '', 'Подсчёт:', chartData.reports.length, '', 'CV [%]:', cv.toFixed(3)],
        ['Весы:', 'SCALE 1', '', 'Средний [Гр]:', avgWeight?.toFixed(3) || '0.000', '', 'Единообразие [%]:', uniformity.toFixed(3)],
        ['Замечание:', '', '', 'Ст. отклонение [Гр]:', stdDeviation.toFixed(3), '', 'Скорость [1/Час]:', '']
      ];

      // Пустая строка
      const emptyRow = ['', '', '', '', '', '', ''];

      // Заголовки таблицы
      const tableHeader = ['Файл', 'Количество', 'Дата и время', 'Вес [Гр]', 'Пол / Лимит / Категория'];

      // Данные таблицы
      const tableData = chartData.reports.map((report, index) => {
        const dateTime = report.date ? `${report.date} 00:00:00` : '';
        return [
          chartData.controlPointName,
          index + 1,
          dateTime,
          report.gram?.toFixed(3) || '0.000',
          'Не использовался'
        ];
      });

      // Собираем все данные
      const wsData = [
        ...headerData,
        emptyRow,
        tableHeader,
        ...tableData
      ];

      // Создаем лист
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Устанавливаем ширину колонок
      ws['!cols'] = [
        { wch: 15 },  // Файл
        { wch: 12 },  // Количество
        { wch: 20 },  // Дата и время
        { wch: 12 },  // Вес
        { wch: 25 }   // Пол / Лимит / Категория
      ];

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(wb, ws, 'Отчёт');

      // Генерируем имя файла
      const fileName = `${chartData.controlPointName}_${chartData.date}_${metric.label}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting XLSX:', error);
      alert('Ошибка при экспорте в XLSX');
    }
  };

  const handleExportCSV = () => {
    if (!chartData || !chartData.reports || chartData.reports.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      const metric = getMetricByKey(chartData.metricKey);
      const safeRangePercent = 
        typeof uniformityRangePercent === 'number' && Number.isFinite(uniformityRangePercent)
          ? uniformityRangePercent
          : 10;
      const points = buildDailyPoints(chartData.reports, safeRangePercent);
      
      // Вычисляем агрегированные метрики
      const allWeights = chartData.reports.map(r => r.gram).filter(g => typeof g === 'number' && Number.isFinite(g));
      const avgWeight = mean(allWeights);
      const stdDeviation = stdDev(allWeights);
      const cv = avgWeight > 0 ? (stdDeviation / avgWeight) * 100 : 0;
      const lastPoint = points[points.length - 1];
      const uniformity = lastPoint?.uniformity ?? 0;

      // Формируем CSV содержимое с точкой с запятой как разделителем (для русского Excel)
      let csvContent = '';
      
      // Заголовок с метаданными (3 строки)
      csvContent += `Файл:;${chartData.controlPointName};;Подсчёт:;${chartData.reports.length};;CV [%]:;${cv.toFixed(3)}\n`;
      csvContent += `Весы:;SCALE 1;;Средний [Гр]:;${avgWeight?.toFixed(3) || '0.000'};;Единообразие [%]:;${uniformity.toFixed(3)}\n`;
      csvContent += `Замечание:;;;Ст. отклонение [Гр]:;${stdDeviation.toFixed(3)};;Скорость [1/Час]:;\n`;
      
      // Пустая строка и заголовки таблицы
      csvContent += `;;;;;;;\n`;
      csvContent += 'Файл;Количество;Дата и время;Вес [Гр];Пол / Лимит / Категория\n';

      // Данные таблицы
      chartData.reports.forEach((report, index) => {
        const dateTime = report.date ? `${report.date} 00:00:00` : '';
        const weight = report.gram?.toFixed(3) || '0.000';
        csvContent += `${chartData.controlPointName};${index + 1};${dateTime};${weight};Не использовался\n`;
      });

      // Создаем Blob и скачиваем
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `${chartData.controlPointName}_${chartData.date}_${metric.label}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Ошибка при экспорте в CSV');
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading message="Загрузка данных..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <h1>Отчеты</h1>

      <FiltersForm
        onFilter={(filters) => {
          setSelectedControlPointId(filters.control_point_id);
          setSelectedControlPointName(filters.control_point_name || '');
        }}
      />

      <div className="chart-section">
        <h2 className="chart-section-title">Отклонение по точкам</h2>

        <div className="chart-controls">
          <div className="control-group">
            <select
              value={selectedMetricKey}
              onChange={(e) => setSelectedMetricKey(e.target.value)}
              className="filter-select"
            >
              {REPORT_METRICS.map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>

          {selectedMetricKey === 'uniformity' && (
            <div className="control-group">
              <label>Целевой диапазон, %</label>
              <input
                className="filter-input"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={uniformityRangePercent}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setUniformityRangePercent('');
                    return;
                  }
                  const parsed = Number(value);
                  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return;
                  setUniformityRangePercent(Math.min(Math.max(parsed, 0), 100));
                }}
              />
            </div>
          )}

          <div className="control-group">
            <DateDropdownPicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Дата"
            />
          </div>

          <button className="btn btn-primary" onClick={handleGenerateChart}>
            Сформировать
          </button>
        </div>

        {chartData && (
          <div className="chart-container">
            <div className="chart">
              {(() => {
                const metric = getMetricByKey(chartData.metricKey);
                // Обработка пустого значения uniformityRangePercent
                const safeRangePercent = 
                  typeof uniformityRangePercent === 'number' && Number.isFinite(uniformityRangePercent)
                    ? uniformityRangePercent
                    : 10;
                const points = buildDailyPoints(chartData.reports, safeRangePercent);
                const values = (points || [])
                  .map((point) => toNumberOrNull(metric.getValue(point)))
                  .filter((v) => v !== null);

                if (!values.length) {
                  return (
                    <>
                      <h3 className="chart-title">{chartData.controlPointName}</h3>
                      <div className="empty-state">
                        Нет данных для показателя «{metric.label}». Выберите другой показатель.
                      </div>
                    </>
                  );
                }

                const maxValue = Math.max(...values);
                // Ось Y: для процентов фиксированная 0-100%, для веса - динамическая
                const { yMax, ticks: tickValues, step } = buildYAxis(values, metric.unit, metric.key);

                const xStep = 700 / Math.max(points.length - 1, 1);
                // График занимает высоту от y=350 до y=80, то есть 270 пикселей
                const getY = (value) => 350 - (value / yMax) * 270;
                const safeValueAt = (index) => toNumberOrNull(metric.getValue(points[index]));

                return (
                  <>
                    <h3 className="chart-title">
                      {chartData.controlPointName} — {metric.label}
                    </h3>
                    <svg viewBox="0 0 800 400" className="chart-svg">
                      {/* Сетка - динамическое количество линий в зависимости от количества меток */}
                      {tickValues.map((tick, idx) => {
                        const yPosition = 350 - (idx / (tickValues.length - 1)) * 270;
                        return (
                          <line
                            key={`grid-${idx}`}
                            x1="60"
                            y1={yPosition}
                            x2="800"
                            y2={yPosition}
                            stroke="#e0e0e0"
                            strokeWidth="1"
                          />
                        );
                      })}

                      {/* Метки на оси Y */}
                      {tickValues.map((tick, idx) => {
                        const yPosition = 350 - (idx / (tickValues.length - 1)) * 270;
                        return (
                          <text
                            key={`y-tick-${idx}`}
                            x="50"
                            y={yPosition + 5}
                            fontSize="12"
                            textAnchor="end"
                            fill="#616661"
                          >
                            {formatTick(tick, metric.unit, step)}
                          </text>
                        );
                      })}

                      {/* Линии между точками */}
                      {points.map((_, index) => {
                        if (index === 0) return null;
                        const prev = safeValueAt(index - 1);
                        const curr = safeValueAt(index);
                        if (prev === null || curr === null) return null;

                        const x1 = 80 + (index - 1) * xStep;
                        const x2 = 80 + index * xStep;
                        return (
                          <line
                            key={`line-${index}`}
                            x1={x1}
                            y1={getY(prev)}
                            x2={x2}
                            y2={getY(curr)}
                            stroke="#17672F"
                            strokeWidth="2"
                          />
                        );
                      })}

                      {/* Метки на оси X (дни) */}
                      {points.map((_, index) => {
                        const x = 80 + index * xStep;
                        return (
                          <text
                            key={`label-${index}`}
                            x={x}
                            y="375"
                            fontSize="12"
                            textAnchor="middle"
                            fill="#616661"
                          >
                            {index + 1}
                          </text>
                        );
                      })}
                    </svg>
                  </>
                );
              })()}
            </div>

            <div className="chart-actions">
              <button className="btn btn-primary" onClick={handleExportXLSX}>
                Выгрузить XLSX
              </button>
              <button className="btn btn-outlined" onClick={handleExportCSV}>
                Выгрузить CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
