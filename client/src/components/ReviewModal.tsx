import { useState } from 'react';
import { Star } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { useToast } from './ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import type { Appointment } from '@/lib/types';

interface ReviewModalProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ appointment, open, onClose, onSuccess }: ReviewModalProps) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Escolhe uma classificação');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/client/appointments/${appointment.id}/review`, {
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success('Avaliação enviada com sucesso');
      setRating(0);
      setComment('');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Avaliar marcação"
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || rating === 0}>
            {loading ? <Spinner /> : 'Enviar avaliação'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label mb-3">Classificação *</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted'
                  }
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Comentário (opcional)</label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partilha a tua experiência..."
            maxLength={1000}
          />
          <p className="text-xs text-muted mt-1">{comment.length}/1000</p>
        </div>
      </div>
    </Modal>
  );
}
