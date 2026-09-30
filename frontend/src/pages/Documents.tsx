import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  X,
  Building,
} from "lucide-react";
import {
  type DocumentRecord,
  getDocuments,
  createDocument,
  verifyDocument,
  deleteDocument,
} from "../api/documents";
import { getEmployees, type Employee } from "../api/employees";

const CATEGORIES = [
  { key: "all", label: "All Categories" },
  { key: "policy", label: "Company Policies" },
  { key: "identity", label: "Identity & Tax" },
  { key: "offer_letter", label: "Offer Letters" },
  { key: "contract", label: "Contracts" },
  { key: "certificate", label: "Certificates" },
  { key: "other", label: "Other" },
];

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "policy",
    file_url: "",
    file_size_kb: 512,
    employee_id: "",
    expiry_date: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsData, empsData] = await Promise.all([
        getDocuments(),
        getEmployees(),
      ]);
      setDocuments(docsData);
      setEmployees(empsData);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getEmployeeName = (id?: string | null) => {
    if (!id) return "Organization (Company-wide)";
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name || ""} (${emp.employee_code})` : id.slice(0, 8);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createDocument({
        title: form.title,
        category: form.category,
        file_url: form.file_url,
        file_size_kb: Number(form.file_size_kb),
        employee_id: form.employee_id || null,
        expiry_date: form.expiry_date || null,
      });
      setShowUploadModal(false);
      setForm({
        title: "",
        category: "policy",
        file_url: "",
        file_size_kb: 512,
        employee_id: "",
        expiry_date: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to upload document record.");
    }
  };

  const handleVerify = async (id: string, status: "verified" | "rejected") => {
    try {
      await verifyDocument(id, status);
      fetchData();
    } catch (err: any) {
      alert("Failed to update verification status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this document?")) return;
    try {
      await deleteDocument(id);
      fetchData();
    } catch (err: any) {
      alert("Failed to delete document.");
    }
  };

  // Metrics
  const totalDocs = documents.length;
  const verifiedDocs = documents.filter((d) => d.verification_status === "verified").length;
  const pendingDocs = documents.filter((d) => d.verification_status === "pending").length;
  const policiesCount = documents.filter((d) => d.category === "policy").length;

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEmployeeName(d.employee_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || d.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || d.verification_status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Document Vault</h1>
          <p className="text-sm text-slate-500 mt-1">
            Secure compliance repository for employee contracts, tax IDs, company policies, and official verification.
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
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalDocs}</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Registered in vault</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Files</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{verifiedDocs}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Compliance approved</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Audit</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{pendingDocs}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">Awaiting HR verification</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Policies</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{policiesCount}</p>
            <p className="text-xs text-blue-600 font-medium mt-1">Organization handbooks</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents or employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Document Title</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Owner / Target</th>
                <th className="px-6 py-3">Size / Expiry</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading enterprise documents...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No documents found</p>
                    <p className="text-xs text-slate-400 mt-1">Upload company policies or employee compliance certificates.</p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{doc.title}</p>
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Document Link
                          </a>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 capitalize">
                        {doc.category.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {getEmployeeName(doc.employee_id)}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div>{doc.file_size_kb} KB</div>
                      {doc.expiry_date && (
                        <div className="text-[11px] text-amber-600 font-medium">Expires: {doc.expiry_date}</div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                          doc.verification_status === "verified"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : doc.verification_status === "rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {doc.verification_status === "verified" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {doc.verification_status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                        {doc.verification_status === "pending" && <Clock className="w-3.5 h-3.5" />}
                        {doc.verification_status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {doc.verification_status === "pending" && (
                          <>
                            <button
                              onClick={() => handleVerify(doc.id, "verified")}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                              title="Verify document"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleVerify(doc.id, "rejected")}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                              title="Reject document"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: UPLOAD DOCUMENT */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Upload Enterprise Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Employee Code of Conduct 2026"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="policy">Company Policy</option>
                    <option value="identity">Identity & Tax</option>
                    <option value="offer_letter">Offer Letter</option>
                    <option value="contract">Employment Contract</option>
                    <option value="certificate">Certification</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Employee</label>
                  <select
                    value={form.employee_id}
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Company-Wide (All Employees)</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name || ""} ({e.employee_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">File Storage URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://storage.cloud.google.com/hrm-docs/..."
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">File Size (KB)</label>
                  <input
                    type="number"
                    value={form.file_size_kb}
                    onChange={(e) => setForm({ ...form, file_size_kb: Number(e.target.value) })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Register Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
