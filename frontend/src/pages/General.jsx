import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import FiltersForm from '../components/FiltersForm';
import ReportSection from '../components/ReportSection';
import { farmsAPI } from '../services/api';

export default function General() {
  const [loading, setLoading] = useState(true);
  const [selectedControlPointId, setSelectedControlPointId] = useState(null);
  const [selectedControlPointName, setSelectedControlPointName] = useState('');

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
