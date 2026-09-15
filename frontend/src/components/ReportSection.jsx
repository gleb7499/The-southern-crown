import { useState, useEffect } from 'react';
import { getGrowthNormsForControlPoint } from '../services/growthNormsStorage';

export default function ReportSection({ controlPointId, controlPointName }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const growthNorms = controlPointId ? getGrowthNormsForControlPoint(controlPointId) : null;

  useEffect(() => {
    if (controlPointId) {
      loadReports(controlPointId);
    }
  }, [controlPointId]);

  const loadReports = async (cpId) => {
    try {
      setLoading(true);
      setError(null);

      // Use a relative path so the Vite proxy works
      const response = await fetch(`/api/reports/?control_point_id=${cpId}`, {
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

      // Sort reports by date (newest last)
      const sortedReports = (data || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      setReports(sortedReports);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('Ошибка при загрузке отчета');
    } finally {
      setLoading(false);
    }
  };

  // Take the latest report (today's)
  const todayReport = reports.length > 0 ? reports[reports.length - 1] : null;

  if (!controlPointId) {
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
            {reports
              .slice()
              .reverse()
              .map((report, index) => {
                const developmentDay = reports.length - index;
                const reportIsoDate = report?.date ? String(report.date) : null;

                const normGramByDate =
                  growthNorms?.byDate && reportIsoDate ? growthNorms.byDate[reportIsoDate] : null;
                const normGramByDay =
                  growthNorms?.byDay && developmentDay
                    ? growthNorms.byDay[String(developmentDay)]
                    : null;

                const normGram =
                  typeof normGramByDate === 'number'
                    ? normGramByDate
                    : typeof normGramByDay === 'number'
                      ? normGramByDay
                      : null;

                const dayDeviation =
                  normGram && normGram > 0
                    ? Math.round(((report.gram - normGram) / normGram) * 100)
                    : 0;
                return (
                  <div key={report.id} className="report-item-vertical report-day-row">
                    <div className="report-day-column">
                      <span className="report-label-top">День развития</span>
                      <span className="report-value-large">{developmentDay}</span>
                    </div>
                    <div className="report-day-column">
                      <span className="report-label-top">Среднее отклонение</span>
                      <div className="report-deviation-value">
                        <span className="deviation-number">{report.gram}</span>
                        <div className="deviation-with-icon">
                          {dayDeviation > 0 ? (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              style={{ marginRight: '4px' }}
                            >
                              <path
                                d="M1.33334 10.6666L5.33334 6.66664L8.66668 9.33331L14.3333 4.33326M11.7447 4.19159L14.5731 4.19159V7.02002"
                                stroke="#D82424"
                                strokeWidth="1.5"
                              />
                            </svg>
                          ) : dayDeviation < 0 ? (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              style={{ marginRight: '4px' }}
                            >
                              <path
                                d="M1.33334 10.6667L5.33334 6.6667L8.66668 9.33337L14.3333 4.33333M11.7447 4.19165L14.5731 4.19165V7.02008"
                                stroke="#17672F"
                                strokeWidth="1.5"
                              />
                            </svg>
                          ) : (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              style={{ marginRight: '4px' }}
                            >
                              <path
                                d="M1.33334 10.6667L5.33334 6.6667L8.66668 9.33337L14.3333 4.33333M11.7447 4.19165L14.5731 4.19165V7.02008"
                                stroke="#616661"
                                strokeWidth="1.5"
                              />
                            </svg>
                          )}
                          <span
                            className="deviation-percent"
                            style={{
                              color:
                                dayDeviation > 0
                                  ? '#D82424'
                                  : dayDeviation < 0
                                    ? '#17672F'
                                    : '#616661',
                            }}
                          >
                            {normGram ? `${dayDeviation}%` : '—'}
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
