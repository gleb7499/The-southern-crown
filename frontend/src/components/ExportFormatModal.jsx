import { useState } from 'react';
import Modal from './Modal';

export default function ExportFormatModal({ isOpen, onClose, reportData }) {
  const [selectedFormat, setSelectedFormat] = useState('xlsx');

  const exportToCSV = (data) => {
    if (!data || !data.charts || data.charts.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    // Create CSV content
    let csvContent = 'Точка контроля,День,Значение\n';

    data.charts.forEach((chart) => {
      chart.days.forEach((day, index) => {
        csvContent += `${chart.control_point_name},${day},${chart.values[index]}\n`;
      });
    });

    // Add overall deviation
    if (data.overall_deviation) {
      csvContent += '\nОбщее отклонение\n';
      csvContent += 'День,Значение\n';
      data.overall_deviation.days.forEach((day, index) => {
        csvContent += `${day},${data.overall_deviation.values[index]}\n`;
      });
    }

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToXLSX = (data) => {
    if (!data || !data.charts || data.charts.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    // For XLSX, we'll create a simple HTML table and download as Excel-compatible format
    let htmlContent = '<html><head><meta charset="utf-8"></head><body><table border="1">';

    // Add data
    data.charts.forEach((chart) => {
      htmlContent += `<tr><th colspan="3">${chart.control_point_name}</th></tr>`;
      htmlContent += '<tr><th>День</th><th>Значение</th></tr>';
      chart.days.forEach((day, index) => {
        htmlContent += `<tr><td>${day}</td><td>${chart.values[index]}</td></tr>`;
      });
      htmlContent += '<tr><td colspan="3"></td></tr>';
    });

    // Add overall deviation
    if (data.overall_deviation) {
      htmlContent += '<tr><th colspan="3">Общее отклонение</th></tr>';
      htmlContent += '<tr><th>День</th><th>Значение</th></tr>';
      data.overall_deviation.days.forEach((day, index) => {
        htmlContent += `<tr><td>${day}</td><td>${data.overall_deviation.values[index]}</td></tr>`;
      });
    }

    htmlContent += '</table></body></html>';

    // Download file
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report_${Date.now()}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (!reportData) {
      alert('Сначала сформируйте отчёт');
      onClose();
      return;
    }

    if (selectedFormat === 'csv') {
      exportToCSV(reportData);
    } else {
      exportToXLSX(reportData);
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Выбор формата выгрузки</h2>
      <div className="export-options">
        <div
          className={`export-option ${selectedFormat === 'xlsx' ? 'selected' : ''}`}
          onClick={() => setSelectedFormat('xlsx')}
        >
          XLSX
        </div>
        <div
          className={`export-option ${selectedFormat === 'csv' ? 'selected' : ''}`}
          onClick={() => setSelectedFormat('csv')}
        >
          CSV
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" onClick={handleExport}>
          OK
        </button>
      </div>
    </Modal>
  );
}
