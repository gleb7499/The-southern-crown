import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import FiltersForm from '../components/FiltersForm';
import { farmsAPI } from '../services/api';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [selectedControlPointId, setSelectedControlPointId] = useState(null);
  const [selectedControlPointName, setSelectedControlPointName] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('средний вес');
  const [selectedDate, setSelectedDate] = useState('');
  const [chartData, setChartData] = useState(null);

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

      setChartData({
        controlPointName: selectedControlPointName,
        reports: sortedReports,
        date: selectedDate,
        weight: selectedWeight,
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
            <label>Средний вес</label>
            <select
              value={selectedWeight}
              onChange={(e) => setSelectedWeight(e.target.value)}
              className="filter-select"
            >
              <option value="средний вес">Средний вес</option>
              <option value="минимальный вес">Минимальный вес</option>
              <option value="максимальный вес">Максимальный вес</option>
              <option value="стандартное отклонение">Стандартное отклонение</option>
            </select>
          </div>

          <div className="control-group">
            <label>Дата</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <button className="btn btn-primary" onClick={handleGenerateChart}>
            Сформировать
          </button>
        </div>

        {chartData && (
          <div className="chart-container">
            <div className="chart">
              <h3 className="chart-title">{chartData.controlPointName}</h3>
              <svg viewBox="0 0 800 400" className="chart-svg">
                {/* Сетка */}
                <line x1="60" y1="350" x2="800" y2="350" stroke="#e0e0e0" strokeWidth="1" />
                <line x1="60" y1="260" x2="800" y2="260" stroke="#e0e0e0" strokeWidth="1" />
                <line x1="60" y1="170" x2="800" y2="170" stroke="#e0e0e0" strokeWidth="1" />
                <line x1="60" y1="80" x2="800" y2="80" stroke="#e0e0e0" strokeWidth="1" />

                {/* Метки на оси Y (граммы) */}
                <text x="50" y="355" fontSize="12" textAnchor="end" fill="#616661">
                  0г
                </text>
                <text x="50" y="265" fontSize="12" textAnchor="end" fill="#616661">
                  500г
                </text>
                <text x="50" y="175" fontSize="12" textAnchor="end" fill="#616661">
                  1000г
                </text>
                <text x="50" y="85" fontSize="12" textAnchor="end" fill="#616661">
                  1500г
                </text>

                {/* Данные графика */}

                {/* Линии между точками */}
                {chartData.reports.map((report, index) => {
                  if (index === 0) return null;
                  const x1 = 80 + (index - 1) * (700 / Math.max(chartData.reports.length - 1, 1));
                  const y1 = 350 - (chartData.reports[index - 1].gram / 1500) * 260;
                  const x2 = 80 + index * (700 / Math.max(chartData.reports.length - 1, 1));
                  const y2 = 350 - (report.gram / 1500) * 260;
                  return (
                    <line
                      key={`line-${index}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#17672F"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* Метки на оси X (дни) */}
                {chartData.reports.map((report, index) => {
                  const x = 80 + index * (700 / Math.max(chartData.reports.length - 1, 1));
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
