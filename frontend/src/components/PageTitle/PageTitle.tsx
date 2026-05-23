interface PageTitleProps {
  children: React.ReactNode;
  center?: boolean;
  size?: 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClass = {
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

export default function PageTitle({
  children,
  center = false,
  size = '2xl',
  className = '',
}: PageTitleProps) {
  return (
    <h1
      className={`page-title ${sizeClass[size]} text-gray-800 tracking-wide ${center ? 'text-center w-full' : ''} ${className}`}
    >
      {children}
    </h1>
  );
}
