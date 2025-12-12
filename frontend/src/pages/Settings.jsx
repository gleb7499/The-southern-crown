import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import CameraPreviewModal from '../components/CameraPreviewModal';
import CalendarModal from '../components/CalendarModal';
import { farmsAPI, controlPointsAPI, camerasAPI } from '../services/api';

export default function Settings() {
  const [farms, setFarms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [cameras, setCameras] = useState([]);
  
  const [newPointData, setNewPointData] = useState({
    farmName: '',
    buildingName: '',
    pointName: ''
  });
  
  const [newCameraData, setNewCameraData] = useState({
    name: '',
    url: '',
    control_point_id: ''
  });
  
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [farmsRes, camerasRes] = await Promise.all([
        farmsAPI.getFarms(),
        camerasAPI.getCameras()
      ]);
      setFarms(farmsRes.data);
      setCameras(camerasRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreatePoint = async (e) => {
    e.preventDefault();
    alert(`Создание точки контроля: ${newPointData.farmName} / ${newPointData.buildingName} / ${newPointData.pointName}`);
    setNewPointData({ farmName: '', buildingName: '', pointName: '' });
  };

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    
    try {
      // For stub, use first control point if available
      const controlPointId = 1;
      await camerasAPI.createCamera({
        name: newCameraData.name,
        url: newCameraData.url,
        control_point_id: controlPointId
      });
      
      setNewCameraData({ name: '', url: '', control_point_id: '' });
      loadData();
    } catch (error) {
      alert('Камера добавлена (заглушка)');
      setNewCameraData({ name: '', url: '', control_point_id: '' });
    }
  };

  const handleDeleteCamera = async (cameraId) => {
    try {
      await camerasAPI.deleteCamera(cameraId);
      loadData();
    } catch (error) {
      console.error('Error deleting camera:', error);
    }
  };

  const handlePreviewCamera = (camera) => {
    setSelectedCamera(camera);
    setShowCameraPreview(true);
  };

  return (
    <Layout>
      <h1>Настройка</h1>
      
      <div className="settings-section">
        <h2>Создание точки контроля</h2>
        <form onSubmit={handleCreatePoint}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Название фермы</label>
              <input
                type="text"
                value={newPointData.farmName}
                onChange={(e) => setNewPointData({...newPointData, farmName: e.target.value})}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Название корпуса</label>
              <input
                type="text"
                value={newPointData.buildingName}
                onChange={(e) => setNewPointData({...newPointData, buildingName: e.target.value})}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Название точки</label>
              <input
                type="text"
                value={newPointData.pointName}
                onChange={(e) => setNewPointData({...newPointData, pointName: e.target.value})}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Создать точку контроля</button>
        </form>
      </div>

      <div className="settings-section">
        <h2>Добавление камеры</h2>
        <form onSubmit={handleCreateCamera}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>URL камеры</label>
              <input
                type="text"
                value={newCameraData.url}
                onChange={(e) => setNewCameraData({...newCameraData, url: e.target.value})}
                placeholder="rtsp://example.com/stream"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Имя камеры</label>
              <input
                type="text"
                value={newCameraData.name}
                onChange={(e) => setNewCameraData({...newCameraData, name: e.target.value})}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Добавить камеру</button>
        </form>
      </div>

      <div className="settings-section">
        <h2>Список камер</h2>
        <div className="camera-list">
          {cameras.length > 0 ? (
            cameras.map(camera => (
              <div key={camera.id} className="camera-item">
                <div>
                  <strong>{camera.name}</strong>
                  <br />
                  <small>{camera.url}</small>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn" 
                    onClick={() => handlePreviewCamera(camera)}
                  >
                    Просмотр
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleDeleteCamera(camera.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="camera-item">
                <div>
                  <strong>Камера 1</strong>
                  <br />
                  <small>rtsp://example.com/camera1</small>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn" 
                    onClick={() => handlePreviewCamera({ id: 1, name: 'Камера 1', url: 'rtsp://example.com/camera1' })}
                  >
                    Просмотр
                  </button>
                  <button className="btn">Удалить</button>
                </div>
              </div>
              <div className="camera-item">
                <div>
                  <strong>Камера 2</strong>
                  <br />
                  <small>rtsp://example.com/camera2</small>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn" 
                    onClick={() => handlePreviewCamera({ id: 2, name: 'Камера 2', url: 'rtsp://example.com/camera2' })}
                  >
                    Просмотр
                  </button>
                  <button className="btn">Удалить</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <button className="btn btn-primary" onClick={() => setShowDataModal(true)}>
          Вывести изображение
        </button>
        <button 
          className="btn" 
          onClick={() => setShowCalendar(true)}
          style={{ marginLeft: '10px' }}
        >
          Данные нового вывода
        </button>
      </div>

      <CameraPreviewModal
        isOpen={showCameraPreview}
        onClose={() => setShowCameraPreview(false)}
        camera={selectedCamera}
      />

      {showDataModal && (
        <div className="modal-overlay" onClick={() => setShowDataModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Вывести изображение</h2>
            <div style={{ 
              width: '100%', 
              height: '300px', 
              backgroundColor: '#ccc', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              border: '1px solid #999',
              marginTop: '20px'
            }}>
              <p>Заглушка вывода изображения</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowDataModal(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <CalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={(date) => {
          alert(`Выбрана дата: ${date.toLocaleDateString('ru-RU')}`);
        }}
      />
    </Layout>
  );
}
