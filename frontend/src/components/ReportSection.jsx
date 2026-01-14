import { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';

export default function ReportSection({ controlPointId, controlPointName }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (controlPointId) {
      loadReports(controlPointId);
    }
  }, [controlPointId]);

  const loadReports = async (cpId) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading reports for control point:', cpId);
      
      // Используем относительный путь чтобы работал прокси Vite
      const response = await fetch(`/api/reports/?control_point_id=${cpId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Reports loaded:', data);
      console.log('Total reports count:', data?.length || 0);
      
      // Сортируем отчеты по дате (новые в конце)
      const sortedReports = (data || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      console.log('Sorted reports:', sortedReports);
      setReports(sortedReports);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('Ошибка при загрузке отчета');
    } finally {
      setLoading(false);
    }
  };

  // Рассчитываем среднее значение в граммах за последние 5 дней
  const calculateAverageGram = () => {
    if (reports.length === 0) return 0;
    
    // Берём данные за последние 5 дней
    const recentReports = reports.slice(-5);
    const avgGram = recentReports.reduce((sum, r) => sum + (r.gram || 0), 0) / recentReports.length;
    
    return Math.round(avgGram);
  };

  // Рассчитываем процент отклонения от нормы
  const calculateDeviationPercent = () => {
    if (reports.length === 0) return 0;
    
    // Берём данные за последние 5 дней
    const recentReports = reports.slice(-5);
    const avgGram = recentReports.reduce((sum, r) => sum + (r.gram || 0), 0) / recentReports.length;
    
    // Примерная норма для контрольной точки - 1500г
    const norm = 1500;
    const deviation = ((avgGram - norm) / norm * 100).toFixed(2);
    
    return deviation;
  };

  // Берём последний отчет (сегодняшний)
  const todayReport = reports.length > 0 ? reports[reports.length - 1] : null;
  const todayDayOfDevelopment = reports.length; // День развития = количество дней с отчетами

  console.log('ReportSection render:', {
    controlPointId,
    controlPointName,
    reportsLength: reports.length,
    todayDayOfDevelopment,
    todayReport
  });

  if (!controlPointId) {
    console.log('No controlPointId, returning null');
    return null;
  }

  if (loading) {
    return (
      <div className="report-section">
        <div className="report-loading">Загрузка отчета...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-section">
        <div className="report-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="report-section">
      <h2 className="report-title">{controlPointName}</h2>
      
      {todayReport ? (
        <div className="report-content">
          <div className="report-grid">
            {reports.slice().reverse().map((report, index) => {
              const dayDeviation = Math.round((report.gram - 1500) / 1500 * 100);
              return (
                <div key={report.id} className="report-item-vertical report-day-row">
                  <div className="report-day-column">
                    <span className="report-label-top">День развития</span>
                    <span className="report-value-large">{reports.length - index}</span>
                  </div>
                  <div className="report-day-column">
                    <span className="report-label-top">Среднее отклонение</span>
                    <div className="report-deviation-value">
                      <span className="deviation-number">{report.gram}</span>
                      <div className="deviation-with-icon">
                        {dayDeviation > 0 ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                            <path d="M1.33334 10.6666L5.33334 6.66664L8.66668 9.33331L14.3333 4.33326M11.7447 4.19159L14.5731 4.19159V7.02002" stroke="#D82424" strokeWidth="1.5"/>
                          </svg>
                        ) : dayDeviation < 0 ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                            <path d="M1.33334 10.6667L5.33334 6.6667L8.66668 9.33337L14.3333 4.33333M11.7447 4.19165L14.5731 4.19165V7.02008" stroke="#17672F" strokeWidth="1.5"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                            <path d="M1.33334 10.6667L5.33334 6.6667L8.66668 9.33337L14.3333 4.33333M11.7447 4.19165L14.5731 4.19165V7.02008" stroke="#616661" strokeWidth="1.5"/>
                          </svg>
                        )}
                        <span 
                          className="deviation-percent"
                          style={{
                            color: dayDeviation > 0 ? '#D82424' : dayDeviation < 0 ? '#17672F' : '#616661'
                          }}
                        >
                          {dayDeviation}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="report-empty">
          <p>Нет данных отчета</p>
        </div>
      )}
    </div>
  );
}
