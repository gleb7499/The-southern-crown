import Modal from './Modal';

export default function AlertModal({ isOpen, onClose, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isAlert={true}>
      <h2>ALERT</h2>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={onClose}>
          Хорошо
        </button>
      </div>
    </Modal>
  );
}
