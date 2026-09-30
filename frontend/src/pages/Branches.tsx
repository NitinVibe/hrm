import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Globe,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createBranch,
  deactivateBranch,
  getBranches,
  updateBranch,
  type Branch,
  type BranchPayload,
} from "../api/branches";

function parseApiError(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((i: any) => i.msg).join(", ");
  }
  return fallback;
}

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [search, setSearch] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [form, setForm] = useState<BranchPayload>({
    name: "",
    code: "",
    city: "",
    state: "",
    country: "India",
    address: "",
    timezone: "Asia/Kolkata",
  });

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (err: any) {
      setError(parseApiError(err, "Failed to load branches."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    return branches.filter((b) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [branches, search]);

  function openCreate() {
    setEditingBranch(null);
    setForm({
      name: "",
      code: "",
      city: "",
      state: "",
      country: "India",
      address: "",
      timezone: "Asia/Kolkata",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function openEdit(b: Branch) {
    setEditingBranch(b);
    setForm({
      name: b.name,
      code: b.code,
      city: b.city ?? "",
      state: b.state ?? "",
      country: b.country,
      address: b.address ?? "",
      timezone: b.timezone,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Branch Name and Code are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, form);
        setSuccess(`Branch "${form.name}" updated successfully.`);
      } else {
        await createBranch(form);
        setSuccess(`Branch "${form.name}" created successfully.`);
      }
      setIsModalOpen(false);
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setFormError(parseApiError(err, "Failed to save branch."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(b: Branch) {
    if (!confirm(`Are you sure you want to deactivate branch "${b.name}"?`)) return;
    try {
      await deactivateBranch(b.id);
      setSuccess(`Branch "${b.name}" deactivated.`);
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(parseApiError(err, "Failed to deactivate branch."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Branches & Locations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Multi-office locations, regional compliance hubs, and timezones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Branch
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")}><X size={16} /></button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches by name, city, code..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-medium text-slate-500">
          Showing {filtered.length} of {branches.length} locations
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-44 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Building size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-800">No branches configured</p>
            <p className="mt-1 text-xs text-slate-400">Add regional offices and locations for your organization.</p>
          </div>
        ) : (
          filtered.map((b) => (
            <div key={b.id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{b.name}</h3>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                      {b.code}
                    </span>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  b.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {b.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  <span>{[b.address, b.city, b.state, b.country].filter(Boolean).join(", ") || "No address specified"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-slate-400" />
                  <span>Timezone: {b.timezone}</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => openEdit(b)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                  title="Edit branch"
                >
                  <Pencil size={15} />
                </button>
                {b.is_active && (
                  <button
                    onClick={() => void handleDeactivate(b)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                    title="Deactivate branch"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingBranch ? "Edit Branch" : "Add Branch"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Bangalore Tech Hub"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. BLR-HQ"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    value={form.city ?? ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Bangalore"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">State</label>
                  <input
                    type="text"
                    value={form.state ?? ""}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Address</label>
                <textarea
                  rows={2}
                  value={form.address ?? ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, floor, building details..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  {editingBranch ? "Save Changes" : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
