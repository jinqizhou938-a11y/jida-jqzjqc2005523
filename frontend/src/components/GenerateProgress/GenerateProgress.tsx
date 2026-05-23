const STEPS = [
  { key: 'parse', label: '解析链接', icon: '🔗' },
  { key: 'extract', label: '抽取画面', icon: '🎬' },
  { key: 'select', label: 'AI 择优', icon: '🤖' },
  { key: 'recognize', label: '识别穿搭', icon: '👗' },
  { key: 'tryon', label: '模特换装', icon: '✨' },
];

interface GenerateProgressProps {
  currentStep: number;
  message?: string;
}

export default function GenerateProgress({ currentStep, message }: GenerateProgressProps) {
  const progressWidth = `${(currentStep / (STEPS.length - 1)) * 100}%`;

  return (
    <div className="w-full max-w-md mx-auto py-8 space-y-6">
      <div className="flex justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-rose-100" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-rose-400 transition-all duration-500"
          style={{ width: progressWidth }}
        />
        {STEPS.map((step, i) => (
          <div key={step.key} className="relative flex flex-col items-center z-10">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
                i <= currentStep
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'bg-white border-2 border-brand-light text-gray-400'
              }`}
            >
              {i < currentStep ? '✓' : step.icon}
            </div>
            <span className={`mt-2 text-xs ${i <= currentStep ? 'text-brand-dark font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      {message && <p className="text-center text-sm text-gray-500 animate-pulse">{message}</p>}
    </div>
  );
}
