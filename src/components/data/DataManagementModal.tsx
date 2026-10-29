import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  downloadFile,
  exportToJson,
  exportToXml,
} from "../../services/dataStorageService";
import { X, Database, Download, RefreshCw } from "lucide-react";
interface Props {
  isOpen: boolean;
  onClose: () => void;
}
export const DataManagementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    getFullDatabaseSnapshot,
    syncDataToServerNow,
    sqliteConnected,
  } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!isOpen) return null;
  const snapshot = getFullDatabaseSnapshot();
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-title"
    >
      <section className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-5">
        <div className="flex justify-between items-center">
          <h2 id="data-title" className="font-bold text-xl flex gap-2">
            <Database />
            Dữ liệu Supabase
          </h2>
          <button aria-label="Đóng quản lý dữ liệu" onClick={onClose}>
            <X />
          </button>
        </div>
        <p className="text-sm text-slate-600">
          {sqliteConnected
            ? "Đã kết nối Supabase PostgreSQL."
            : "Chưa xác nhận kết nối. Hãy thử tải lại."}{" "}
          Dữ liệu chỉ hiển thị theo quyền của tài khoản đang đăng nhập.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>Tài khoản được xem: {snapshot.users.length}</div>
          <div>Nhật ký được xem: {snapshot.journalEntries.length}</div>
          <div>Tham vấn được xem: {snapshot.consultations.length}</div>
          <div>Vai trò: {currentUser.role}</div>
        </div>
        <button
          disabled={busy}
          className="flex gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl disabled:opacity-50"
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              const result = await syncDataToServerNow();
              setMessage(result.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={18} />
          {busy ? "Đang đồng bộ..." : "Tải dữ liệu mới nhất"}
        </button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <div className="flex gap-3">
          <button
            className="border rounded-xl p-3 flex gap-2"
            onClick={() =>
              downloadFile(
                "codegenz_export.json",
                exportToJson(snapshot),
                "application/json",
              )
            }
          >
            <Download size={18} />
            Xuất JSON
          </button>
          <button
            className="border rounded-xl p-3"
            onClick={() =>
              downloadFile(
                "codegenz_export.xml",
                exportToXml(snapshot),
                "application/xml",
              )
            }
          >
            Xuất XML
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Bản xuất không chứa mật khẩu Supabase Auth. Việc nhập toàn bộ dữ liệu
          hoặc chuyển hệ thống cần công cụ migration có đối soát; không ghi đè
          dữ liệu thật bằng dữ liệu mẫu.
        </p>
      </section>
    </div>
  );
};
