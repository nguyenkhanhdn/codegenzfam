import React, { useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';

export const SITE_URL = 'https://codegenzfam.vercel.app';

export function SiteShareCard({ familyCode }: { familyCode?: string }) {
  const [status, setStatus] = useState('');
  const share = async () => {
    try {
      const text = familyCode
        ? `Tham gia CODE GenZ Family cùng gia đình. Sau khi đăng nhập, nhập mã kết nối: ${familyCode}`
        : 'Tham gia CODE GenZ Family';
      if (navigator.share) {
        await navigator.share({ title: 'CODE GenZ Family', text, url: SITE_URL });
        setStatus('');
      } else {
        await navigator.clipboard.writeText(`${text}\n${SITE_URL}`);
        setStatus('Đã sao chép lời mời và đường dẫn.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setStatus('Chưa thể chia sẻ tự động. Bạn có thể sao chép đường dẫn bên dưới.');
    }
  };
  return (
    <div className="bg-white rounded-2xl p-4 text-center space-y-3 text-slate-800">
      <img src="/site-qr.svg" width={220} height={220} className="w-48 h-48 max-w-full mx-auto" alt="Mã QR mở website CODE GenZ Family" />
      <div className="text-sm font-bold">Quét QR để mở CODE GenZ Family</div>
      <a href={SITE_URL} className="block text-xs text-indigo-700 break-all underline">{SITE_URL}</a>
      <p className="text-xs text-slate-600">Sau khi đăng ký hoặc đăng nhập, nhập mã kết nối gia đình ở bên cạnh để tham gia.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
          <Share2 className="w-4 h-4" />Chia sẻ
        </button>
        <a href="/site-qr.svg" download="codegenzfam-qr.svg" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
          <Download className="w-4 h-4" />Tải QR
        </a>
        <button type="button" onClick={async () => {
          try { await navigator.clipboard.writeText(SITE_URL); setStatus('Đã sao chép đường dẫn.'); }
          catch { setStatus('Hãy nhấn giữ đường dẫn phía trên để sao chép.'); }
        }} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
          <Copy className="w-4 h-4" />Chép link
        </button>
      </div>
      <p role="status" className="text-xs text-slate-600">{status}</p>
    </div>
  );
}
