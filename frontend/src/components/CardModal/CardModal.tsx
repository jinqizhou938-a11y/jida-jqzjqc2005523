import { useEffect, useState } from 'react';

interface CardModalProps {
  open: boolean;
  onClose: () => void;
  note?: string;
  onSaveNote?: (note: string) => void;
  title?: string;
  children: React.ReactNode;
}

export default function CardModal({
  open,
  onClose,
  note: initialNote = '',
  onSaveNote,
  title = '搭配详情',
  children,
}: CardModalProps) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleSave = () => {
    onSaveNote?.(note);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="relative z-50" role="presentation">
      <button
        type="button"
        className="fixed inset-0 bg-black/30 backdrop-blur-sm border-0 cursor-default"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-modal-title"
          className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 id="card-modal-title" className="text-lg font-semibold text-gray-800">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ×
            </button>
          </div>
          <div className="p-4">{children}</div>
          {onSaveNote && (
            <div className="p-4 border-t border-gray-100 space-y-3">
              <label htmlFor="note" className="text-sm text-gray-600">
                私人笔记
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="记录你的穿搭灵感..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-rose-300 resize-none h-20"
              />
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl bg-rose-500 text-white text-sm hover:bg-rose-600"
              >
                保存笔记
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
