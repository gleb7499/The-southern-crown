import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import AlertModal from '../components/AlertModal';
import Loading from '../components/Loading';
import FiltersForm from '../components/FiltersForm';
import ReportSection from '../components/ReportSection';
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
  const [selectedControlPointId, setSelectedControlPointId] = useState(null);
  const [selectedControlPointName, setSelectedControlPointName] = useState('');

  useEffect(() => {
    // Show alert immediately before loading data
    checkAlert();
    loadInitialData();
  }, []);

  const checkAlert = async () => {
    try {
      const alertRes = await reportsAPI.getAlert();
      if (alertRes.data.status === 'critical') {
        setAlertMessage(alertRes.data.message);
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error checking alert:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const farmsRes = await farmsAPI.getFarms();
      setFarms(farmsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleFarmChange = async (farmId) => {
    const newSelected = selectedFarms.includes(farmId)
      ? selectedFarms.filter((id) => id !== farmId)
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
      ? selectedBuildings.filter((id) => id !== buildingId)
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

      <FiltersForm
        onFilter={(filters) => {
          console.log('Filters applied:', filters);
          setSelectedControlPointId(filters.control_point_id);
          setSelectedControlPointName(filters.control_point_name || '');
        }}
      />

      <ReportSection
        controlPointId={selectedControlPointId}
        controlPointName={selectedControlPointName}
      />
    </Layout>
  );
}
