import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import AlertModal from '../components/AlertModal';
import Loading from '../components/Loading';
import { farmsAPI, controlPointsAPI, reportsAPI } from '../services/api';

export default function General() {
  const [farms, setFarms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [controlPoints, setControlPoints] = useState([]);
  const [selectedFarms, setSelectedFarms] = useState([]);
  const [selectedBuildings, setSelectedBuildings] = useState([]);
  const [selectedControlPoints, setSelectedControlPoints] = useState([]);
  const [filteredPoints, setFilteredPoints] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [farmsRes, alertRes] = await Promise.all([
        farmsAPI.getFarms(),
        reportsAPI.getAlert()
      ]);
      
      setFarms(farmsRes.data);
      
      if (alertRes.data.status === 'critical') {
        setAlertMessage(alertRes.data.message);
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
    } else {
      setBuildings([]);
    }
  };

  const handleBuildingChange = (buildingId) => {
    const newSelected = selectedBuildings.includes(buildingId)
      ? selectedBuildings.filter(id => id !== buildingId)
      : [...selectedBuildings, buildingId];
    
    setSelectedBuildings(newSelected);
  };

  const handleFilter = async () => {
    try {
      setFiltering(true);
      const res = await controlPointsAPI.getControlPoints(selectedFarms, selectedBuildings);
      setFilteredPoints(res.data);
    } catch (error) {
      console.error('Error filtering control points:', error);
      alert('Ошибка при фильтрации точек контроля');
    } finally {
      setFiltering(false);
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
      <h1>Общее</h1>
      
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
            size="5"
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
            size="5"
          >
            {buildings.map(building => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Точка контроля</label>
          <select multiple size="5">
            <option>Точка 1</option>
            <option>Точка 2</option>
            <option>Точка 3</option>
          </select>
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleFilter}
          disabled={filtering}
        >
          {filtering ? 'Загрузка...' : 'OK'}
        </button>
      </div>

      <div className="input-fields">
        <div className="input-field">
          <label>Точка контроля</label>
          <input type="text" readOnly />
        </div>
        <div className="input-field">
          <label>День развития</label>
          <input type="text" readOnly />
        </div>
        <div className="input-field">
          <label>Среднее отклонение на сегодня</label>
          <input type="text" readOnly />
        </div>
      </div>

      <div className="cards-container">
        {filteredPoints.map(point => (
          <div key={point.id} className="card">
            <h3>{point.name}</h3>
            <p>Ферма: {point.farm_name}</p>
            <p>Корпус: {point.building_name}</p>
            <p>День развития: {point.day_of_development}</p>
            <p>Отклонение: {point.average_deviation}</p>
          </div>
        ))}
        
        {filteredPoints.length === 0 && (
          <>
            <div className="card">
              <h3>Параметр 1</h3>
              <p>Значение: 100</p>
              <p>Статус: Норма</p>
            </div>
            <div className="card">
              <h3>Параметр 2</h3>
              <p>Значение: 95</p>
              <p>Статус: Норма</p>
            </div>
            <div className="card">
              <h3>Параметр 3</h3>
              <p>Значение: 88</p>
              <p>Статус: Внимание</p>
            </div>
          </>
        )}
      </div>

      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
      />
    </Layout>
  );
}
