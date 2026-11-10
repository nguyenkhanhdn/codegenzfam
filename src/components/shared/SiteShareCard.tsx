import React, { useEffect, useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';

import QRCode from 'qrcode';
import { buildFamilyInviteUrl } from '../../services/familyInviteLink';

export function SiteShareCard({ familyCode }: { familyCode?: string }) {
  const [status, setStatus] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrError, setQrError] = useState(false);
  const inviteUrl = buildFamilyInviteUrl(familyCode);
  useEffect(() => {
    let cancelled = false;
    setQrImage(''); setQrError(false);
    QRCode.toDataURL(inviteUrl, { width: 480, margin: 4, errorCorrectionLevel: 'M' })
      .then(image => { if (!cancelled) setQrImage(image); })
      .catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [inviteUrl]);
  const share = async () => {
    try {
      const text = familyCode
        ? `Tham gia CODE GenZ Family cùng gia đình. Đăng nhập rồi xác nhận tham gia gia đình ${familyCode}. Mã đã được điền sẵn.`
        : 'Tham gia CODE GenZ Family';
      if (navigator.share) {
        await navigator.share({ title: 'CODE GenZ Family', text, url: inviteUrl });
        setStatus('');
      } else {
        await navigator.clipboard.writeText(`${text}\n${inviteUrl}`);
        setStatus('Đã sao chép lời mời và đường dẫn.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setStatus('Chưa thể chia sẻ tự động. Bạn có thể sao chép đường dẫn bên dưới.');
    }
  };
  return (
    <div className="bg-white rounded-2xl p-4 text-center space-y-3 text-slate-800">
      {qrImage ? <img src={qrImage} width={220} height={220} className="w-48 h-48 max-w-full mx-auto" alt="Mã QR mở phần kết nối gia đình CODE GenZ" /> : <p className="text-xs text-slate-600">{qrError ? 'Chưa tạo được QR. Hãy dùng đường dẫn bên dưới.' : 'Đang tạo QR...'}</p>}
      <div className="text-sm font-bold">Quét QR để kết nối gia đình</div>
      <a href={inviteUrl} className="block text-xs text-indigo-700 break-all underline">{inviteUrl}</a>
      <p className="text-xs text-slate-600">Quét QR, đăng nhập hoặc đăng ký rồi xác nhận tham gia. Mã gia đình được điền sẵn.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
          <Share2 className="w-4 h-4" />Chia sẻ
        </button>
        {qrImage && <a href={qrImage} download="codegenzfam-moi-gia-dinh.png" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
          <Download className="w-4 h-4" />Tải QR
        </a>}
        <button type="button" onClick={async () => {
          try { await navigator.clipboard.writeText(inviteUrl); setStatus('Đã sao chép đường dẫn.'); }
          catch { setStatus('Hãy nhấn giữ đường dẫn phía trên để sao chép.'); }
        }} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
          <Copy className="w-4 h-4" />Chép link
        </button>
      </div>
      <p role="status" className="text-xs text-slate-600">{status}</p>
    </div>
  );
}
