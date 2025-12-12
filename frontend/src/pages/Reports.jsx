import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import CalendarModal from '../components/CalendarModal';
import ExportFormatModal from '../components/ExportFormatModal';
import Loading from '../components/Loading';
import { farmsAPI, controlPointsAPI, reportsAPI } from '../services/api';

export default function Reports() {
  const [farms, setFarms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedFarms, setSelectedFarms] = useState([]);
  const [selectedBuildings, setSelectedBuildings] = useState([]);
  const [selectedControlPoints, setSelectedControlPoints] = useState([]);
  const [selectedIndicator, setSelectedIndicator] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectingDate, setSelectingDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      setLoading(true);
      const farmsRes = await farmsAPI.getFarms();
      setFarms(farmsRes.data);
    } catch (error) {
      console.error('Error loading farms:', error);
      alert('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleFarmChange = async (farmId) => {
    const newSelected = selectedFarms.includes(farmId)
      ? selectedFarms.filter(id => id !== farmId)
      : [...selectedFarms, farmId];
    
    setSelectedFarms(newSelected);
    
    if (newSelected.length > 0) {
      try {
        const buildingsRes = await farmsAPI.getBuildings(newSelected[0]);
        setBuildings(buildingsRes.data);
      } catch (error) {
        console.error('Error loading buildings:', error);
      }
    }
  };

  const handleDateSelect = (field) => {
    setSelectingDate(field);
    setShowCalendar(true);
  };

  const handleCalendarSelect = (date) => {
    if (selectingDate === 'start') {
      setStartDate(date);
    } else if (selectingDate === 'end') {
      setEndDate(date);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await reportsAPI.generate({
        farm_ids: selectedFarms,
        building_ids: selectedBuildings,
        control_point_ids: selectedControlPoints.length > 0 ? selectedControlPoints : [1, 2, 3],
        indicator: selectedIndicator || 'средний вес',
        start_date: startDate ? startDate.toISOString().split('T')[0] : null,
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
      });
      setReportData(res.data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Ошибка при генерации отчёта');
    } finally {
      setGenerating(false);
    }
  };

  const indicators = [
    'средний вес',
    '%',
    'единобразие',
    'стандартное отклонение'
  ];

  if (loading) {
    return (
      <Layout>
        <Loading message="Загрузка данных..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <h1>Отчёты</h1>
      
      <div className="filters">
        <div className="filter-group">
          <label>Ферма</label>
          <select 
            multiple 
            value={selectedFarms}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions);
              const values = options.map(opt => parseInt(opt.value));
              setSelectedFarms(values);
              if (values.length > 0) {
                farmsAPI.getBuildings(values[0]).then(res => setBuildings(res.data));
              }
            }}
            size="3"
          >
            {farms.map(farm => (
              <option key={farm.id} value={farm.id}>{farm.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Корпус</label>
          <select 
            multiple 
            value={selectedBuildings}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions);
              const values = options.map(opt => parseInt(opt.value));
              setSelectedBuildings(values);
            }}
            size="3"
          >
            {buildings.map(building => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Точка контроля</label>
          <select multiple size="3">
            <option>Точка 1</option>
            <option>Точка 2</option>
            <option>Точка 3</option>
          </select>
        </div>
        
        <button className="btn btn-primary" onClick={handleGenerate}>OK</button>
      </div>

      <div className="report-controls">
        <div className="form-group">
          <label>Выбор показателя</label>
          <select 
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
          >
            <option value="">Выберите показатель</option>
            {indicators.map(indicator => (
              <option key={indicator} value={indicator}>{indicator}</option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button className="btn" onClick={() => handleDateSelect('start')}>
            Начальная дата {startDate ? `: ${startDate.toLocaleDateString('ru-RU')}` : ''}
          </button>
          <button className="btn" onClick={() => handleDateSelect('end')}>
            Конечная дата {endDate ? `: ${endDate.toLocaleDateString('ru-RU')}` : ''}
          </button>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Генерация...' : 'Сформировать'}
          </button>
        </div>
      </div>

      {generating && <Loading message="Генерация отчёта..." />}

      <div className="charts-container">
        {reportData ? (
          <>
            {reportData.charts.map((chart, index) => (
              <div key={index} className="chart">
                <h3>{chart.control_point_name}</h3>
                <div className="chart-placeholder">
                  График: {chart.control_point_name}
                </div>
                <div className="chart-labels">
                  <span>Отклонение в граммах (Y)</span>
                  <span>День развития (X)</span>
                </div>
              </div>
            ))}
            
            <div className="chart">
              <h3>Отклонение общее</h3>
              <div className="chart-placeholder">
                График: {reportData.overall_deviation.control_point_name}
              </div>
              <div className="chart-labels">
                <span>Отклонение в граммах (Y)</span>
                <span>День развития (X)</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="chart">
              <h3>График 1</h3>
              <div className="chart-placeholder">Заглушка графика</div>
              <div className="chart-labels">
                <span>Отклонение в граммах (Y)</span>
                <span>День развития (X)</span>
              </div>
            </div>
            
            <div className="chart">
              <h3>График 2</h3>
              <div className="chart-placeholder">Заглушка графика</div>
              <div className="chart-labels">
                <span>Отклонение в граммах (Y)</span>
                <span>День развития (X)</span>
              </div>
            </div>
            
            <div className="chart">
              <h3>Отклонение общее</h3>
              <div className="chart-placeholder">Заглушка графика</div>
              <div className="chart-labels">
                <span>Отклонение в граммах (Y)</span>
                <span>День развития (X)</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <button className="btn btn-primary" onClick={() => setShowExport(true)}>
          Выгрузить
        </button>
      </div>

      <CalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={handleCalendarSelect}
      />

      <ExportFormatModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        reportData={reportData}
      />
    </Layout>
  );
}
