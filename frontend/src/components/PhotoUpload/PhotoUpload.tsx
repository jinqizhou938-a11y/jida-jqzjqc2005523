import { useRef, useState } from 'react';

interface PhotoUploadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

const MAX_SIZE = 8 * 1024 * 1024;

export default function PhotoUpload({ value, onChange, disabled, compact }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('请上传 JPG 或 PNG 图片');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('图片不能超过 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className={compact ? 'w-full' : 'w-full max-w-xl mx-auto'}>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
          error ? 'border-red-300 bg-red-50' : value ? 'border-brand/40 bg-white' : 'border-gray-200 bg-gray-50 hover:border-brand/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {value ? (
          <div className={`relative flex items-center justify-center bg-gray-50 ${compact ? 'min-h-[160px] max-h-[220px]' : 'min-h-[360px] max-h-[480px]'}`}>
            <img
              src={value}
              alt="试衣模特"
              className={`max-w-full w-auto h-auto object-contain ${compact ? 'max-h-[220px]' : 'max-h-[480px]'}`}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent flex items-end justify-center pb-2 pt-6">
              <span className="text-xs text-white bg-black/40 px-3 py-1 rounded-full">更换模特照</span>
            </div>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center gap-2 px-4 text-center ${compact ? 'min-h-[120px] py-4' : 'min-h-[280px]'}`}>
            <span className="text-3xl">👤</span>
            <p className="text-sm font-medium text-gray-700">上传试衣模特照</p>
            <p className="text-xs text-gray-400">全身正面 · JPG/PNG · 8MB 内</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && <p className="text-sm text-red-500 mt-2 px-1">{error}</p>}
    </div>
  );
}
