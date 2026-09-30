import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createShift,
  deactivateShift,
  getShifts,
  updateShift,
  type Shift,
  type ShiftPayload,
} from "../api/shifts";

function parseApiError(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => {
        const field = item.loc ? item.loc[item.loc.length - 1] : "Field";
        return `${field}: ${item.msg}`;
      })
      .join(", ");
  }
  return fallback;
}

function formatTimeString(timeStr: string): string {
  if (!timeStr) return "—";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes} ${ampm}`;
}

function calculateDuration(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return "—";
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "—";

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    // Overnight shift
    endMinutes += 24 * 60;
  }
  const diffMinutes = endMinutes - startMinutes;
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [form, setForm] = useState<{
    name: string;
    start_time: string;
    end_time: string;
    grace_minutes: number;
  }>({
    name: "",
    start_time: "09:00",
    end_time: "17:00",
    grace_minutes: 15,
  });

  const [deactivatingShift, setDeactivatingShift] = useState<Shift | null>(null);
  const [deactivateBusy, setDeactivateBusy] = useState<boolean>(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await getShifts();
      setShifts(data);
    } catch (err: any) {
      setError(parseApiError(err, "Failed to load shifts."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    return shifts.filter((s) => {
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return s.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [shifts, search, statusFilter]);

  function handleOpenCreate() {
    setEditingShift(null);
    setForm({
      name: "",
      start_time: "09:00",
      end_time: "17:00",
      grace_minutes: 15,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(s: Shift) {
    setEditingShift(s);
    setForm({
      name: s.name,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      grace_minutes: s.grace_minutes ?? 15,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Shift name is required.");
      return;
    }
    if (!form.start_time || !form.end_time) {
      setFormError("Both start time and end time are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const payload: ShiftPayload = {
        name: form.name.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
        grace_minutes: Number(form.grace_minutes) || 0,
      };

      if (editingShift) {
        await updateShift(editingShift.id, payload);
        setSuccessMessage(`Shift "${payload.name}" updated successfully.`);
      } else {
        await createShift(payload);
        setSuccessMessage(`Shift "${payload.name}" created successfully.`);
      }

      setIsModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setFormError(parseApiError(err, "Failed to save shift."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingShift) return;
    setDeactivateBusy(true);
    try {
      await deactivateShift(deactivatingShift.id);
      setSuccessMessage(`Shift "${deactivatingShift.name}" deactivated.`);
      setDeactivatingShift(null);
      await loadData();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setError(parseApiError(err, "Failed to deactivate shift."));
    } finally {
      setDeactivateBusy(false);
    }
  }

  const activeCount = useMemo(
    () => shifts.filter((s) => s.is_active).length,
    [shifts],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Shifts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {shifts.length} total shifts configured ({activeCount} active)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Refresh shifts"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Shift
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shifts by name..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Shift Name</th>
                <th className="px-6 py-4">Working Hours</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Grace Window</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 rounded bg-slate-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-36 rounded bg-slate-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 rounded bg-slate-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 rounded bg-slate-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 rounded bg-slate-200" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="ml-auto h-4 w-12 rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                        <Clock3 size={24} />
                      </div>
                      <p className="text-base font-semibold text-slate-800">
                        No shifts found
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {search || statusFilter !== "all"
                          ? "Try clearing your filters or search term."
                          : "Configure your first shift to assign employees."}
                      </p>
                      {!search && statusFilter === "all" && (
                        <button
                          onClick={handleOpenCreate}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                          <Plus size={16} />
                          Add Shift
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Clock size={16} />
                        </div>
                        <span className="font-semibold text-slate-900">
                          {s.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-800">
                      {formatTimeString(s.start_time)} – {formatTimeString(s.end_time)}
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      <span className="rounded-lg bg-slate-100 px-2 py-1">
                        {calculateDuration(s.start_time, s.end_time)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {s.grace_minutes} minutes
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                          title="Edit shift"
                        >
                          <Pencil size={15} />
                        </button>
                        {s.is_active && (
                          <button
                            onClick={() => setDeactivatingShift(s)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                            title="Deactivate shift"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingShift ? "Edit Shift" : "Add Shift"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Shift Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Regular Morning Shift"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={form.start_time}
                    onChange={(e) =>
                      setForm({ ...form, start_time: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={form.end_time}
                    onChange={(e) =>
                      setForm({ ...form, end_time: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.grace_minutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      grace_minutes: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Allowed delay before an employee check-in is marked as Late.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  {editingShift ? "Save Changes" : "Create Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivatingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Deactivate Shift
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-slate-900">
                "{deactivatingShift.name}"
              </span>
              ? Existing attendance records will remain intact, but new schedules or
              employees cannot be newly assigned to this shift.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDeactivatingShift(null)}
                disabled={deactivateBusy}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeactivate()}
                disabled={deactivateBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-60"
              >
                {deactivateBusy && (
                  <RefreshCw size={14} className="animate-spin" />
                )}
                Confirm Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
