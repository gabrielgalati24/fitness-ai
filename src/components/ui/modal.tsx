// components/ui/modal.tsx
import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg relative max-w-full max-h-full overflow-auto">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="Cerrar Modal"
        >
          <X className="h-6 w-6" />
        </button>
        {children}
      </div>
    </div>
  );
}
