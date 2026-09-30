import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  FileCode,
  X,
  Activity,
  CheckCircle,
} from "lucide-react";
import { type AuditLog, getAuditLogs } from "../api/auditLogs";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        action: actionFilter !== "all" ? actionFilter : undefined,
        entity_type: entityFilter !== "all" ? entityFilter : undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user_id && log.user_id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("INSERT")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("CHANGE")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    if (act.includes("DELETE") || act.includes("DEACTIVATE") || act.includes("REJECT")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (act.includes("APPROVE") || act.includes("VERIFY")) {
      return "bg-teal-50 text-teal-700 border-teal-200";
    }
    if (act.includes("LOGIN") || act.includes("AUTH")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (act.includes("PAYROLL")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit & Compliance Trail</h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable system security log tracking sensitive changes, logins, payroll calculations, and records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 text-sm font-medium"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Trail
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Events</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{logs.length}</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Tamper-evident entries</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant Scope</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">Isolated</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Single organization partition</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliance Status</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">Audited</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Full action traceability</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, entity or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="DEACTIVATE">DEACTIVATE</option>
            <option value="APPROVE_LEAVE">APPROVE_LEAVE</option>
            <option value="REJECT_LEAVE">REJECT_LEAVE</option>
            <option value="RUN_PAYROLL">RUN_PAYROLL</option>
            <option value="APPROVE_PAYROLL">APPROVE_PAYROLL</option>
            <option value="PAY_PAYROLL">PAY_PAYROLL</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Entities</option>
            <option value="user">User</option>
            <option value="employee">Employee</option>
            <option value="payroll_run">Payroll Run</option>
            <option value="leave">Leave Request</option>
            <option value="leave_type">Leave Type</option>
            <option value="branch">Branch</option>
            <option value="document">Document</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Actor / User</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Target Entity</th>
                <th className="px-6 py-3">IP Address</th>
                <th className="px-6 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans">
                    Loading audit trail entries...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans">
                    <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No audit records found</p>
                    <p className="text-xs text-slate-400 mt-1">Actions performed by users are logged chronologically here.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>

                    <td className="px-6 py-3.5 text-slate-800 font-semibold truncate max-w-[140px]">
                      {log.user_id ? log.user_id.slice(0, 8) + "..." : "System Agent"}
                    </td>

                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-slate-700 font-medium">
                      <span className="capitalize">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({log.entity_id.slice(0, 8)}...)
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-slate-400">
                      {log.ip_address || "127.0.0.1"}
                    </td>

                    <td className="px-6 py-3.5 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: INSPECT AUDIT ENTRY */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Audit Ledger Record</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 font-sans">
                <div>
                  <span className="text-slate-400 block text-[11px]">Action</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Timestamp</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(selectedLog.created_at).toUTCString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Entity Type</span>
                  <span className="text-slate-700 font-medium capitalize">{selectedLog.entity_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Entity ID</span>
                  <span className="text-slate-700 font-medium">{selectedLog.entity_id || "None"}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-700 font-sans font-semibold block mb-1">Audit Details Payload:</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px] leading-relaxed max-h-60">
                  {selectedLog.details
                    ? JSON.stringify(
                        (() => {
                          try {
                            return JSON.parse(selectedLog.details);
                          } catch {
                            return selectedLog.details;
                          }
                        })(),
                        null,
                        2
                      )
                    : "No extra payload metadata recorded."}
                </pre>
              </div>

              <div className="pt-2 flex justify-end font-sans">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
