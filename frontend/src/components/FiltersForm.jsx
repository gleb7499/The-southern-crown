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
    // When the farm changes, reset the dependent fields
    setSelectedFrame('');
    setSelectedControlPoint('');
  }, [selectedFarm]);

  useEffect(() => {
    // When the building changes, reset the control point
    setSelectedControlPoint('');
  }, [selectedFrame]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const farmsRes = await farmsAPI.getFarms();
      setFarms(farmsRes.data);

      // Load all control points from all farms
      const pointsByFarm = await Promise.all(
        (farmsRes.data || []).map(async (farm) => {
          try {
            const pointsRes = await controlPointsAPI.getControlPoints([farm.id], []);
            return (pointsRes.data || []).map((cp) => ({
              ...cp,
              farmName: farm.name,
            }));
          } catch (error) {
            console.error(`Error loading control points for farm ${farm.id}:`, error);
            return [];
          }
        })
      );

      setAllControlPoints(pointsByFarm.flat());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    // Find the selected control point to get its name
    const selectedCP = allControlPoints.find((cp) => cp.id === parseInt(selectedControlPoint));

    onFilter({
      farm_id: selectedFarm,
      control_point_id: selectedControlPoint,
      control_point_name: selectedCP?.name || '',
      frame_name: selectedFrame,
    });
  };

  const filteredControlPoints = (() => {
    const farmId = selectedFarm ? parseInt(selectedFarm) : null;
    if (!farmId) return [];
    return allControlPoints.filter((cp) => cp.farm_id === farmId);
  })();

  const frameOptions = (() => {
    if (!selectedFarm) return [];
    return Array.from(
      new Set(
        filteredControlPoints
          .map((cp) => cp.frame_name)
          .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
          .map((value) => String(value))
      )
    ).sort((a, b) => a.localeCompare(b, 'ru'));
  })();

  const controlPointOptions = (() => {
    if (!selectedFarm || !selectedFrame) return [];
    return filteredControlPoints
      .filter((cp) => String(cp.frame_name || '') === String(selectedFrame))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
  })();

  return (
    <div className="filters-form">
      <div className="filter-item">
        <select
          id="farm"
          value={selectedFarm}
          onChange={(e) => setSelectedFarm(e.target.value)}
          disabled={loading || farms.length === 0}
        >
          <option value="">Ферма</option>
          {farms.map((farm) => (
            <option key={farm.id} value={String(farm.id)}>
              {farm.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <select
          id="frame"
          value={selectedFrame}
          onChange={(e) => setSelectedFrame(e.target.value)}
          disabled={loading || !selectedFarm || frameOptions.length === 0}
        >
          <option value="">Корпус</option>
          {frameOptions.map((frame) => (
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
          disabled={loading || !selectedFarm || !selectedFrame || controlPointOptions.length === 0}
        >
          <option value="">Точка контроля</option>
          {controlPointOptions.map((cp) => (
            <option key={cp.id} value={String(cp.id)}>
              {cp.name}
            </option>
          ))}
        </select>
      </div>

      <button
        className="btn btn-filter"
        onClick={handleFilter}
        disabled={loading || !selectedFarm || !selectedFrame || !selectedControlPoint}
      >
        ОК
      </button>
    </div>
  );
}
