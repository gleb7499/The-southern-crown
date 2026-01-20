import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import FiltersForm from '../components/FiltersForm';
import DateDropdownPicker from '../components/DateDropdownPicker';
import { farmsAPI } from '../services/api';

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
  return unit === '%' ? `${formatted}%` : `${formatted}г`;
}

function buildYAxis(values, unit) {
  const safeValues = (values || []).filter(
    (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0
  );
  const maxValue = safeValues.length ? Math.max(...safeValues) : 0;

  const minYMax = unit === '%' ? 5 : 1;
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
  if (!values.length) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

// По аналогии с бэкендом: variance делим на N (популяционная дисперсия)
function stdDev(values) {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  if (avg === null) return 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
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
    if (dailyMean === null) continue;

    cumulative.push(...g.grams);

    const cumulativeMean = mean(cumulative) ?? dailyMean;
    const sd = stdDev(cumulative);
    const cv = cumulativeMean > 0 ? (sd / cumulativeMean) * 100 : 0;

    // Однородность по формуле со скрина:
    // (кол-во птиц в целевом диапазоне / общее кол-во взвешенных птиц) * 100
    // Диапазон берём как ±X% от накопительного среднего.
    const lower = cumulativeMean * (1 - p);
    const upper = cumulativeMean * (1 + p);
    const inRange = cumulative.filter((v) => v >= lower && v <= upper).length;
    const uniformity = cumulative.length ? (inRange / cumulative.length) * 100 : 0;

    points.push({
      date: g.date,
      nDaily: g.grams.length,
      nCumulative: cumulative.length,
      meanDaily: dailyMean,
      meanCumulative: cumulativeMean,
      stdDev: sd,
      cv,
      uniformity,
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
    alert('Экспорт в XLSX - в разработке');
  };

  const handleExportCSV = () => {
    alert('Экспорт в CSV - в разработке');
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
                  const parsed = Number(e.target.value);
                  if (!Number.isFinite(parsed)) return;
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
                const points = buildDailyPoints(chartData.reports, uniformityRangePercent);
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
                // Ось Y: динамический шаг и "красивые" значения
                const { yMax, ticks: tickValues, step } = buildYAxis(values, metric.unit);

                const xStep = 700 / Math.max(points.length - 1, 1);
                const getY = (value) => 350 - (value / yMax) * 260;
                const safeValueAt = (index) => toNumberOrNull(metric.getValue(points[index]));

                return (
                  <>
                    <h3 className="chart-title">
                      {chartData.controlPointName} — {metric.label}
                    </h3>
                    <svg viewBox="0 0 800 400" className="chart-svg">
                      {/* Сетка */}
                      <line x1="60" y1="350" x2="800" y2="350" stroke="#e0e0e0" strokeWidth="1" />
                      <line x1="60" y1="260" x2="800" y2="260" stroke="#e0e0e0" strokeWidth="1" />
                      <line x1="60" y1="170" x2="800" y2="170" stroke="#e0e0e0" strokeWidth="1" />
                      <line x1="60" y1="80" x2="800" y2="80" stroke="#e0e0e0" strokeWidth="1" />

                      {/* Метки на оси Y */}
                      {tickValues.map((tick, idx) => {
                        const y = [350, 260, 170, 80][idx];
                        return (
                          <text
                            key={`y-tick-${idx}`}
                            x="50"
                            y={y + 5}
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
