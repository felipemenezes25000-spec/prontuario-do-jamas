import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PdfDownloadButtonProps {
  endpoint: string;
  label?: string;
  size?: 'sm' | 'default';
}

export function PdfDownloadButton({
  endpoint,
  label = 'PDF',
  size = 'sm',
}: PdfDownloadButtonProps) {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleClick = () => {
    window.open(`${baseUrl}/api/v1/${endpoint}`, '_blank');
  };

  return (
    <Button variant="outline" size={size} onClick={handleClick}>
      <Printer className="h-4 w-4 mr-1" /> {label}
    </Button>
  );
}
