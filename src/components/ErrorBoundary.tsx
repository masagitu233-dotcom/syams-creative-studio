import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let message = 'Terjadi kendala tak terduga saat memuat tampilan.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed.error?.includes('permission') || parsed.error?.includes('Missing or insufficient')) {
        message = 'Akses data ditolak oleh aturan keamanan Firestore. Pastikan Anda masuk dengan akun yang sesuai.';
      }
    } catch {
      if (error.message) message = error.message;
    }
    return { hasError: true, message };
  }

  override componentDidCatch(error: Error) {
    console.error('App ErrorBoundary caught:', error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F8E1] flex items-center justify-center p-6">
          <div className="nb-card max-w-lg w-full p-8 space-y-5">
            <div className="flex items-center gap-3 text-[#6C151E]">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <h1 className="text-2xl font-bold text-[#171717]">Terjadi Kesalahan Aplikasi</h1>
            </div>
            <p className="text-sm leading-relaxed text-[#404040]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="nb-btn nb-btn-primary px-5 py-2.5 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
