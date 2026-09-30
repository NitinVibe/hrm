import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Megaphone,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Bell,
} from "lucide-react";
import {
  type Announcement,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from "../api/announcements";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "normal" as "low" | "normal" | "urgent",
    expires_at: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load announcements", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createAnnouncement({
        title: form.title,
        content: form.content,
        priority: form.priority,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      });
      setShowModal(false);
      setForm({
        title: "",
        content: "",
        priority: "normal",
        expires_at: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to publish announcement.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this announcement?")) return;
    try {
      await deleteAnnouncement(id);
      fetchData();
    } catch (err: any) {
      alert("Failed to delete announcement.");
    }
  };

  const urgentCount = announcements.filter((a) => a.priority === "urgent").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish organization-wide notices, policy updates, event schedules, and critical alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Publish Notice
          </button>
        </div>
      </div>

      {/* Banner / Stat summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Broadcasts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{announcements.length}</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Active notices</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Urgent Bulletins</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{urgentCount}</p>
            <p className="text-xs text-rose-600 font-medium mt-1">High priority action required</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audience</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">All Staff</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Enterprise broadcast channel</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Announcements Stream */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading broadcasts...</div>
      ) : announcements.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No active announcements</p>
          <p className="text-sm text-slate-400 mt-1">Click "Publish Notice" to share important news with your team.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border shadow-sm p-6 transition-all hover:shadow-md ${
                item.priority === "urgent"
                  ? "border-rose-200 ring-1 ring-rose-100"
                  : "border-slate-200 hover:border-indigo-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        item.priority === "urgent"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : item.priority === "normal"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {item.expires_at && (
                      <span className="text-xs text-amber-600 font-medium">
                        Expires: {new Date(item.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 pt-1">{item.title}</h3>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Remove Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {item.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: PUBLISH ANNOUNCEMENT */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Publish Company Notice</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Company Town Hall & Strategy Review"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed announcement description, agenda, guidelines..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
