import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { farmsAPI, controlPointsAPI, camerasAPI } from '../services/api';
import { parseGrowthNormsFiles } from '../services/growthNormsParsing';
import {
  downloadGrowthNormsAsJson,
  getGrowthNormsForControlPoint,
  upsertGrowthNormsForControlPoint,
} from '../services/growthNormsStorage';

const ADD_FARM_OPTION_VALUE = '__add_farm__';

function LabeledInput({ id, label, value, onChange, placeholder, type = 'text', inputMode, step }) {
  return (
    <div className="modal-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="filter-input"
        inputMode={inputMode}
        step={step}
      />
    </div>
  );
}

export default function Settings() {
  const [farms, setFarms] = useState([]);
  const [controlPoints, setControlPoints] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add farm modal
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');
  const [creatingFarm, setCreatingFarm] = useState(false);
  const [growthUploadBusy, setGrowthUploadBusy] = useState(false);
  const [growthUploadStatus, setGrowthUploadStatus] = useState('');
  const growthFileInputRef = useRef(null);

  // Form states for creating control point
  const [selectedFarm, setSelectedFarm] = useState('');
  const [frameName, setFrameName] = useState('');
  const [controlPointName, setControlPointName] = useState('');

  // Form states for adding camera
  const [selectedCameraFarm, setSelectedCameraFarm] = useState('');
  const [selectedCameraFrame, setSelectedCameraFrame] = useState('');
  const [selectedCameraControlPoint, setSelectedCameraControlPoint] = useState('');
  const [cameraName, setCameraName] = useState('');
  const [cameraUrl, setCameraUrl] = useState('');

  // Form states for growth norms
  const [selectedNormFarm, setSelectedNormFarm] = useState('');
  const [selectedNormFrame, setSelectedNormFrame] = useState('');
  const [selectedNormControlPoint, setSelectedNormControlPoint] = useState('');
  const [chickensQuantity, setChickensQuantity] = useState('');
  const [growthDay, setGrowthDay] = useState('');
  const [initialAverageWeight, setInitialAverageWeight] = useState('');
  const [landingDate, setLandingDate] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [showDataOutputModal, setShowDataOutputModal] = useState(false);
  const [showGrowthNormsModal, setShowGrowthNormsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [farmsRes, controlPointsRes, camerasRes] = await Promise.all([
        farmsAPI.getFarms(),
        controlPointsAPI.getControlPoints(),
        camerasAPI.getCameras(),
      ]);
      setFarms(farmsRes.data);
      setControlPoints(controlPointsRes.data);
      setCameras(camerasRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  // Derived camera selection options
  const cameraFrameOptions = (() => {
    if (!selectedCameraFarm) return [];
    const farmId = parseInt(selectedCameraFarm);
    return Array.from(
      new Set(
        controlPoints
          .filter((cp) => cp.farm_id === farmId)
          .map((cp) => cp.frame_name)
          .filter(Boolean)
      )
    );
  })();

  const cameraControlPointOptions = (() => {
    if (!selectedCameraFarm) return [];
    const farmId = parseInt(selectedCameraFarm);
    return controlPoints.filter(
      (cp) =>
        cp.farm_id === farmId && (!selectedCameraFrame || cp.frame_name === selectedCameraFrame)
    );
  })();

  const handleCreateControlPoint = async (e) => {
    e.preventDefault();
    if (!selectedFarm || !frameName || !controlPointName) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    try {
      setSubmitting(true);
      await controlPointsAPI.createControlPoint({
        farm_id: parseInt(selectedFarm),
        frame_name: frameName,
        name: controlPointName,
      });
      alert('Точка контроля создана успешно');
      setFrameName('');
      setControlPointName('');
      loadData();
    } catch (error) {
      console.error('Error creating control point:', error);
      alert('Ошибка при создании точки контроля');
    } finally {
      setSubmitting(false);
    }
  };

  const closeAddFarmModal = () => {
    if (creatingFarm) return;
    setShowAddFarmModal(false);
    setNewFarmName('');
  };

  const handleCreateFarm = async (e) => {
    e.preventDefault();

    const trimmedName = newFarmName.trim();
    if (!trimmedName) {
      alert('Пожалуйста, введите название фермы');
      return;
    }

    try {
      setCreatingFarm(true);
      const res = await farmsAPI.createFarm({ name: trimmedName });

      setFarms((prev) => {
        const next = [...prev, res.data];
        next.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
        return next;
      });

      setSelectedFarm(String(res.data.id));
      setShowAddFarmModal(false);
      setNewFarmName('');
      alert('Ферма создана');
    } catch (error) {
      console.error('Error creating farm:', error);
      const status = error?.response?.status;
      if (status === 403) {
        alert('Недостаточно прав для создания фермы');
      } else {
        alert('Ошибка при создании фермы');
      }
    } finally {
      setCreatingFarm(false);
    }
  };

  const handleAddCamera = async (e) => {
    e.preventDefault();
    if (!selectedCameraControlPoint || !cameraName || !cameraUrl) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    try {
      setSubmitting(true);
      const controlPoint = controlPoints.find(
        (cp) => cp.id === parseInt(selectedCameraControlPoint)
      );
      if (!controlPoint) {
        alert('Точка контроля не найдена');
        return;
      }

      await camerasAPI.createCamera({
        farm_id: controlPoint.farm_id,
        control_point_id: parseInt(selectedCameraControlPoint),
        name: cameraName,
        url: cameraUrl,
      });
      alert('Камера добавлена успешно');
      setSelectedCameraControlPoint('');
      setSelectedCameraFrame('');
      setSelectedCameraFarm('');
      setCameraName('');
      setCameraUrl('');
      loadData();
    } catch (error) {
      console.error('Error adding camera:', error);
      alert('Ошибка при добавлении камеры');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту камеру?')) {
      return;
    }

    try {
      await camerasAPI.deleteCamera(cameraId);
      alert('Камера удалена успешно');
      loadData();
    } catch (error) {
      console.error('Error deleting camera:', error);
      alert('Ошибка при удалении камеры');
    }
  };

  const handleUploadGrowthFile = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedNormControlPoint) {
      alert('Сначала выберите ферму/корпус/точку контроля, затем загрузите файл норм');
      if (growthFileInputRef.current) growthFileInputRef.current.value = '';
      return;
    }

    try {
      setGrowthUploadBusy(true);
      setGrowthUploadStatus('Чтение файла…');

      const parsed = await parseGrowthNormsFiles(files);
      upsertGrowthNormsForControlPoint(parseInt(selectedNormControlPoint), parsed);

      const byDateCount = parsed.byDate ? Object.keys(parsed.byDate).length : 0;
      const byDayCount = parsed.byDay ? Object.keys(parsed.byDay).length : 0;

      setGrowthUploadStatus(
        `Загружено норм: по датам=${byDateCount}${byDayCount ? `, по дням=${byDayCount}` : ''}`
      );
      alert('Нормы развития загружены и сохранены на фронте для выбранной точки контроля');
    } catch (error) {
      console.error('Error uploading growth norms:', error);
      alert(error?.message || 'Ошибка при загрузке норм развития');
      setGrowthUploadStatus('');
    } finally {
      setGrowthUploadBusy(false);
      if (growthFileInputRef.current) growthFileInputRef.current.value = '';
    }
  };

  const handleDownloadGrowthNorms = () => {
    if (!selectedNormControlPoint) {
      alert('Выберите точку контроля');
      return;
    }
    try {
      downloadGrowthNormsAsJson(parseInt(selectedNormControlPoint));
    } catch (e) {
      alert(e?.message || 'Нет сохранённых норм для выгрузки');
    }
  };

  const handleReplaceGrowthNorms = () => {
    if (!selectedNormControlPoint) {
      alert('Выберите точку контроля');
      return;
    }
    growthFileInputRef.current?.click();
  };

  const handleResetGrowthForm = () => {
    setChickensQuantity('');
    setGrowthDay('');
    setInitialAverageWeight('');
    setLandingDate('');
    setClosingDate('');
  };

  const closeGrowthNormsModal = () => {
    setShowGrowthNormsModal(false);
    handleResetGrowthForm();
  };

  const handleSaveGrowthNorms = async () => {
    if (
      !selectedNormFarm ||
      !selectedNormControlPoint ||
      !chickensQuantity ||
      !growthDay ||
      !initialAverageWeight ||
      !landingDate ||
      !closingDate
    ) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    try {
      alert('Нормы развития сохранены (функция в разработке)');
      handleResetGrowthForm();
      setShowGrowthNormsModal(false);
    } catch (error) {
      console.error('Error saving growth norms:', error);
      alert('Ошибка при сохранении норм развития');
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading message="Загрузка настроек..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <h1>Настройка камер</h1>

      <div className="settings-section">
        <h2 className="settings-section-title">Добавление камер</h2>

        {/* Create Control Point Form */}
        <div className="settings-block">
          <h3 className="settings-block-title">Создать точку контроля</h3>
          <form onSubmit={handleCreateControlPoint} className="settings-form">
            <div className="form-row">
              <div className="form-group">
                <select
                  value={selectedFarm}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === ADD_FARM_OPTION_VALUE) {
                      setShowAddFarmModal(true);
                      return;
                    }
                    setSelectedFarm(value);
                  }}
                  required
                  className="filter-select"
                  title="Ферма"
                >
                  <option value="">Выберите ферму</option>
                  <option value={ADD_FARM_OPTION_VALUE}>+ Добавить ферму…</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={frameName}
                  onChange={(e) => setFrameName(e.target.value)}
                  placeholder="Название корпуса"
                  required
                  className="filter-input"
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={controlPointName}
                  onChange={(e) => setControlPointName(e.target.value)}
                  placeholder="Название точки контроля"
                  required
                  className="filter-input"
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !selectedFarm || !frameName || !controlPointName}
            >
              {submitting ? 'Создание...' : 'Создать'}
            </button>
          </form>
        </div>

        {/* Add Camera Form */}
        <div className="settings-block">
          <h3 className="settings-block-title">Добавить камеру</h3>
          <form onSubmit={handleAddCamera} className="settings-form">
            <div className="form-row add-camera-select-row">
              <div className="form-group">
                <select
                  value={selectedCameraFarm}
                  onChange={(e) => {
                    setSelectedCameraFarm(e.target.value);
                    setSelectedCameraFrame('');
                    setSelectedCameraControlPoint('');
                  }}
                  className="filter-select"
                  title="Ферма"
                >
                  <option value="">Выберите ферму</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <select
                  value={selectedCameraFrame}
                  onChange={(e) => {
                    setSelectedCameraFrame(e.target.value);
                    setSelectedCameraControlPoint('');
                  }}
                  className="filter-select"
                  title="Корпус"
                  disabled={!selectedCameraFarm}
                >
                  <option value="">Выберите корпус</option>
                  {cameraFrameOptions.map((frame) => (
                    <option key={frame} value={frame}>
                      {frame}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <select
                  value={selectedCameraControlPoint}
                  onChange={(e) => setSelectedCameraControlPoint(e.target.value)}
                  className="filter-select"
                  title="Контрольная точка"
                  disabled={!selectedCameraFrame}
                >
                  <option value="">Выберите точку</option>
                  {cameraControlPointOptions.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group add-camera-ok">
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  disabled={!selectedCameraControlPoint}
                >
                  Ок
                </button>
              </div>
            </div>

            <div className="form-row add-camera-hints-row">
              <div className="form-group" style={{ flex: 2 }}>
                <div className="add-camera-hint">URL камеры</div>
              </div>

              <div className="form-group" style={{ flex: 2 }}>
                <div className="add-camera-hint">Название камеры</div>
              </div>

              <div className="form-group" style={{ flex: 1 }} />
            </div>

            <div className="form-row add-camera-inputs-row">
              <div className="form-group" style={{ flex: 2 }}>
                <input
                  type="url"
                  value={cameraUrl}
                  onChange={(e) => setCameraUrl(e.target.value)}
                  placeholder="URL камеры"
                  required
                  className="filter-input"
                  disabled={!selectedCameraControlPoint}
                />
              </div>

              <div className="form-group" style={{ flex: 2 }}>
                <input
                  type="text"
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  placeholder="Название камеры"
                  required
                  className="filter-input"
                  disabled={!selectedCameraControlPoint}
                />
              </div>

              <div
                className="form-group"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={submitting || !selectedCameraControlPoint || !cameraName || !cameraUrl}
                >
                  {submitting ? 'Добавление...' : 'Добавить'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Список камер</h2>
        <div className="cameras-table-container">
          <table className="cameras-table">
            <tbody>
              {cameras.length > 0 ? (
                cameras.map((camera) => (
                  <tr key={camera.id}>
                    <td className="camera-url-cell">{camera.url}</td>
                    <td className="camera-name-cell">{camera.name}</td>
                    <td className="camera-action-cell">
                      <button
                        className="btn-delete-camera"
                        onClick={() => handleDeleteCamera(camera.id)}
                        title="Удалить камеру"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="no-data">
                    Камер не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Общее</h2>

        {/* Growth norms block */}
        <div className="settings-block">
          <div className="file-upload-container">
            <input
              type="file"
              id="growth-file"
              onChange={handleUploadGrowthFile}
              ref={growthFileInputRef}
              className="file-input"
              accept=".xlsx,.xls,.csv"
              multiple
              disabled={growthUploadBusy}
            />
            <label htmlFor="growth-file" className="file-label">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: '8px' }}
              >
                <path
                  d="M11.6667 1.96232V3.99992C11.6667 4.93334 11.6667 5.40005 11.8483 5.75657C12.0081 6.07017 12.2631 6.32514 12.5767 6.48493C12.9332 6.66658 13.3999 6.66658 14.3333 6.66658H17.0331M11.6667 1.96232C11.4522 1.87692 11.2307 1.80938 11.0044 1.76055C10.5699 1.66675 10.1104 1.66675 9.19137 1.66675C6.84135 1.66675 5.66634 1.66675 4.77504 2.12089C3.99103 2.52036 3.35361 3.15778 2.95414 3.94179C2.5 4.83309 2.5 5.99986 2.5 8.33341V11.6667C2.5 14.0003 2.5 15.1671 2.95414 16.0584C3.35361 16.8424 3.99103 17.4798 4.77504 17.8793C5.66634 18.3334 6.83311 18.3334 9.16667 18.3334H10.8333C13.1669 18.3334 14.3337 18.3334 15.225 17.8793C16.009 17.4798 16.6464 16.8424 17.0459 16.0584C17.5 15.1671 17.5 14.0003 17.5 11.6667V9.73298C17.5 8.60517 17.5 8.04126 17.3614 7.51741C17.2833 7.22213 17.1731 6.93686 17.0331 6.66658M11.6667 1.96232C11.8176 2.02244 11.9652 2.0914 12.1084 2.16894C12.4994 2.38053 12.846 2.67758 13.5391 3.2717L15.1719 4.67127C16.0282 5.40524 16.4564 5.77223 16.7639 6.21838C16.8631 6.36225 16.953 6.51196 17.0331 6.66658"
                  stroke="#17672F"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Файл с нормами развития
            </label>
            <button
              className="btn btn-primary"
              style={{ maxWidth: '150px' }}
              type="button"
              onClick={handleDownloadGrowthNorms}
              disabled={!selectedNormControlPoint}
            >
              Выгрузить
            </button>
            <button
              className="btn btn-dark"
              style={{ maxWidth: '150px' }}
              type="button"
              onClick={handleReplaceGrowthNorms}
              disabled={growthUploadBusy || !selectedNormControlPoint}
            >
              Заменить
            </button>
          </div>

          {selectedNormControlPoint && (
            <div style={{ marginTop: '8px', color: '#616661', fontSize: '14px' }}>
              {growthUploadBusy
                ? 'Загрузка норм…'
                : growthUploadStatus ||
                  (() => {
                    const existing = getGrowthNormsForControlPoint(
                      parseInt(selectedNormControlPoint)
                    );
                    if (!existing) return 'Нормы для этой точки ещё не загружены';
                    const byDateCount = existing.byDate ? Object.keys(existing.byDate).length : 0;
                    const byDayCount = existing.byDay ? Object.keys(existing.byDay).length : 0;
                    return `Сохранено норм: по датам=${byDateCount}${
                      byDayCount ? `, по дням=${byDayCount}` : ''
                    }`;
                  })()}
            </div>
          )}

          <div className="growth-filters">
            <div className="form-group">
              <select
                value={selectedNormFarm}
                onChange={(e) => {
                  setSelectedNormFarm(e.target.value);
                  setSelectedNormFrame('');
                  setSelectedNormControlPoint('');
                }}
                className="filter-select"
                title="Ферма"
              >
                <option value="">Выберите ферму</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <select
                value={selectedNormFrame}
                onChange={(e) => {
                  setSelectedNormFrame(e.target.value);
                  setSelectedNormControlPoint('');
                }}
                className="filter-select"
                title="Корпус"
                disabled={!selectedNormFarm}
              >
                <option value="">Выберите корпус</option>
                {selectedNormFarm &&
                  Array.from(
                    new Set(
                      controlPoints
                        .filter((cp) => cp.farm_id === parseInt(selectedNormFarm))
                        .map((cp) => cp.frame_name)
                    )
                  ).map((frame) => (
                    <option key={frame} value={frame}>
                      {frame}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <select
                value={selectedNormControlPoint}
                onChange={(e) => setSelectedNormControlPoint(e.target.value)}
                className="filter-select"
                title="Контрольная точка"
                disabled={!selectedNormFrame}
              >
                <option value="">Выберите точку контроля</option>
                {selectedNormFrame &&
                  controlPoints
                    .filter(
                      (cp) =>
                        cp.farm_id === parseInt(selectedNormFarm) &&
                        cp.frame_name === selectedNormFrame
                    )
                    .map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.name}
                      </option>
                    ))}
              </select>
            </div>

            <div className="form-group growth-filters-ok">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedNormFarm || !selectedNormFrame || !selectedNormControlPoint}
              >
                Ок
              </button>
            </div>

            <div className="growth-filters-buttons">
              <button className="btn btn-outlined" onClick={() => setShowGrowthNormsModal(true)}>
                Внести данные
              </button>
              <button
                className="btn btn-primary"
                disabled={!selectedNormFarm || !selectedNormFrame || !selectedNormControlPoint}
              >
                Применить
              </button>
              <button
                className="btn btn-dark"
                onClick={() => {
                  setSelectedNormFarm('');
                  setSelectedNormFrame('');
                  setSelectedNormControlPoint('');
                }}
              >
                Обнулить
              </button>
            </div>
          </div>
        </div>

        <div className="settings-block-actions">
          <button className="btn btn-primary">Сохранить</button>
          <button className="btn btn-dark">Отменить</button>
        </div>
      </div>

      {/* Data output modal */}
      {showDataOutputModal && (
        <div className="modal-overlay" onClick={() => setShowDataOutputModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Данные нового выводка</h2>
            <form className="modal-form">
              <div className="form-group">
                <input type="text" placeholder="Название выводка" className="filter-input" />
              </div>
              <div className="form-group">
                <input type="date" placeholder="Дата выводка" className="filter-input" />
              </div>
              <div className="form-group">
                <input type="number" placeholder="Количество" className="filter-input" />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowDataOutputModal(false)}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => setShowDataOutputModal(false)}
                >
                  Отменить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Growth norms form modal */}
      {showGrowthNormsModal && (
        <div className="modal-overlay" onClick={closeGrowthNormsModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              aria-label="Закрыть"
              onClick={closeGrowthNormsModal}
            >
              ×
            </button>
            <h2>Данные нового выводка</h2>
            <form className="modal-form">
              <div className="modal-grid-row">
                <LabeledInput
                  id="brood-chickens-qty"
                  label="Количество особей"
                  value={chickensQuantity}
                  onChange={(e) => setChickensQuantity(e.target.value)}
                  placeholder="Средний вес"
                  type="number"
                  inputMode="numeric"
                />
                <LabeledInput
                  id="brood-growth-day"
                  label="День развития"
                  value={growthDay}
                  onChange={(e) => setGrowthDay(e.target.value)}
                  placeholder="Название корпуса"
                  type="number"
                  inputMode="numeric"
                />
              </div>

              <div className="modal-grid-row modal-grid-row--single">
                <LabeledInput
                  id="brood-initial-avg-weight"
                  label="Начальный средний вес"
                  value={initialAverageWeight}
                  onChange={(e) => setInitialAverageWeight(e.target.value)}
                  placeholder="Название точки контроля"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                />
              </div>

              <div className="modal-grid-row">
                <LabeledInput
                  id="brood-closing-date"
                  label="Дата закрытия"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  placeholder="Название точки контроля"
                  type="text"
                />
                <LabeledInput
                  id="brood-landing-date"
                  label="Дата посадки"
                  value={landingDate}
                  onChange={(e) => setLandingDate(e.target.value)}
                  placeholder="Название точки контроля"
                  type="text"
                />
              </div>

              <div className="modal-actions modal-actions--center">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveGrowthNorms}
                  disabled={
                    !chickensQuantity ||
                    !growthDay ||
                    !initialAverageWeight ||
                    !landingDate ||
                    !closingDate
                  }
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add farm modal */}
      {showAddFarmModal && (
        <div className="modal-overlay" onClick={closeAddFarmModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Добавить ферму</h2>
            <form className="modal-form" onSubmit={handleCreateFarm}>
              <div className="form-group">
                <input
                  type="text"
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  placeholder="Название фермы"
                  className="filter-input"
                  autoFocus
                  disabled={creatingFarm}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingFarm || !newFarmName.trim()}
                >
                  {creatingFarm ? 'Создание…' : 'Создать'}
                </button>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={closeAddFarmModal}
                  disabled={creatingFarm}
                >
                  Отменить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
