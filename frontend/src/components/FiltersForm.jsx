import { useState, useEffect } from 'react';
import { farmsAPI, controlPointsAPI } from '../services/api';

export default function FiltersForm({ onFilter }) {
  const [farms, setFarms] = useState([]);
  const [controlPoints, setControlPoints] = useState([]);
  const [frameNames, setFrameNames] = useState([]);
  
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedControlPoint, setSelectedControlPoint] = useState('');
  const [selectedFrame, setSelectedFrame] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    if (selectedFarm) {
      loadControlPoints(selectedFarm);
    } else {
      setControlPoints([]);
      setFrameNames([]);
      setSelectedControlPoint('');
      setSelectedFrame('');
    }
  }, [selectedFarm]);

  useEffect(() => {
    if (selectedControlPoint) {
      const selected = controlPoints.find(cp => cp.id === parseInt(selectedControlPoint));
      if (selected) {
        setSelectedFrame(selected.frame_name);
      }
    }
  }, [selectedControlPoint, controlPoints]);

  const loadFarms = async () => {
    try {
      setLoading(true);
      const res = await farmsAPI.getFarms();
      setFarms(res.data);
    } catch (error) {
      console.error('Error loading farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadControlPoints = async (farmId) => {
    try {
      const res = await controlPointsAPI.getControlPoints([farmId], []);
      setControlPoints(res.data);
      
      // Извлекаем уникальные frame_name
      const uniqueFrames = [...new Set(res.data.map(cp => cp.frame_name))];
      setFrameNames(uniqueFrames);
    } catch (error) {
      console.error('Error loading control points:', error);
    }
  };

  const handleFilter = () => {
    // Найти выбранную точку контроля для получения её названия
    const selectedCP = controlPoints.find(cp => cp.id === parseInt(selectedControlPoint));
    
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
          id="farm"
          value={selectedFarm}
          onChange={(e) => setSelectedFarm(e.target.value)}
          disabled={loading}
        >
          <option value="">Ферма</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <select
          id="frame"
          value={selectedFrame}
          onChange={(e) => {
            setSelectedFrame(e.target.value);
            // Найти соответствующую точку контроля по frame_name
            const cp = controlPoints.find(c => c.frame_name === e.target.value);
            if (cp) {
              setSelectedControlPoint(cp.id);
            }
          }}
          disabled={!selectedFarm || frameNames.length === 0}
        >
          <option value="">Корпус</option>
          {frameNames.map((frame) => (
            <option key={frame} value={frame}>
              {frame}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <select
          id="controlPoint"
          value={selectedControlPoint}
          onChange={(e) => setSelectedControlPoint(e.target.value)}
          disabled={!selectedFarm || controlPoints.length === 0}
        >
          <option value="">Точка контроля</option>
          {controlPoints.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.name}
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
