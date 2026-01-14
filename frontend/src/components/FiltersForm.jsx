import { useState, useEffect } from 'react';
import { farmsAPI, controlPointsAPI } from '../services/api';

export default function FiltersForm({ onFilter }) {
  const [farms, setFarms] = useState([]);
  const [allControlPoints, setAllControlPoints] = useState([]);

  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedControlPoint, setSelectedControlPoint] = useState('');
  const [selectedFrame, setSelectedFrame] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedControlPoint) {
      const selected = allControlPoints.find((cp) => cp.id === parseInt(selectedControlPoint));
      if (selected) {
        setSelectedFrame(selected.frame_name);
        setSelectedFarm(selected.farm_id);
      }
    } else {
      setSelectedFrame('');
      setSelectedFarm('');
    }
  }, [selectedControlPoint, allControlPoints]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const farmsRes = await farmsAPI.getFarms();
      setFarms(farmsRes.data);

      // Загружаем все точки контроля со всех ферм
      const allPoints = [];
      for (const farm of farmsRes.data) {
        try {
          const pointsRes = await controlPointsAPI.getControlPoints([farm.id], []);
          // Добавляем информацию о ферме к каждой точке для отображения
          const pointsWithFarmInfo = pointsRes.data.map((cp) => ({
            ...cp,
            farmName: farm.name,
          }));
          allPoints.push(...pointsWithFarmInfo);
        } catch (error) {
          console.error(`Error loading control points for farm ${farm.id}:`, error);
        }
      }
      setAllControlPoints(allPoints);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    // Найти выбранную точку контроля для получения её названия
    const selectedCP = allControlPoints.find((cp) => cp.id === parseInt(selectedControlPoint));

    onFilter({
      farm_id: selectedFarm,
      control_point_id: selectedControlPoint,
      control_point_name: selectedCP?.name || '',
      frame_name: selectedFrame,
    });
  };

  return (
    <div className="filters-form">
      <div className="filter-item">
        <select
          id="controlPoint"
          value={selectedControlPoint}
          onChange={(e) => setSelectedControlPoint(e.target.value)}
          disabled={loading || allControlPoints.length === 0}
        >
          <option value="">Точка контроля</option>
          {allControlPoints.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.name} ({cp.frame_name}, {cp.farmName})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <select
          id="frame"
          value={selectedFrame}
          onChange={(e) => setSelectedFrame(e.target.value)}
          disabled={!selectedControlPoint}
        >
          <option value="">Корпус</option>
          {selectedFrame && <option value={selectedFrame}>{selectedFrame}</option>}
        </select>
      </div>

      <div className="filter-item">
        <select
          id="farm"
          value={selectedFarm}
          onChange={(e) => setSelectedFarm(e.target.value)}
          disabled={!selectedControlPoint}
        >
          <option value="">Ферма</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </select>
      </div>

      <button className="btn btn-filter" onClick={handleFilter}>
        ОК
      </button>
    </div>
  );
}
