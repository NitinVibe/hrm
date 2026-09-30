import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import {
  Bell,
  ChevronDown,
  UserRound,
  Search,
  Check,
  CheckCheck,
  Building2,
  Users,
  MapPin,
  FileText,
  KeyRound,
  History,
  LogOut,
  X,
  Lock,
} from "lucide-react";
import type { Page } from "./Sidebar";
import type { UserProfile } from "../api/auth";
import { changePassword } from "../api/auth";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "../api/notifications";
import { globalSearch, type SearchResponse } from "../api/search";

interface Props {
  user: UserProfile | null;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export default function Topbar({ user, onNavigate, onLogout }: Props) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  // Poll notifications
  const loadNotifications = async () => {
    try {
      const [count, list] = await Promise.all([getUnreadCount(), getNotifications(15)]);
      setUnreadCount(count);
      setNotifications(list);
    } catch {
      // ignore in offline/initial load
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 25000);
    return () => clearInterval(interval);
  }, []);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await globalSearch(searchQuery.trim());
        setSearchResults(res);
        setShowSearchDropdown(true);
      } catch {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Mark Read
  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleSelectSearchResult = (page: string) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    onNavigate(page as Page);
  };

  // Password submission
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");
    if (newPass.length < 6) {
      setPassError("New password must be at least 6 characters long.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("New passwords do not match.");
      return;
    }
    setPassLoading(true);
    try {
      await changePassword(currentPass, newPass);
      setPassSuccess("Password updated successfully!");
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
        setPassSuccess("");
      }, 1500);
    } catch (err: any) {
      setPassError(err.response?.data?.detail || "Failed to update password.");
    } finally {
      setPassLoading(false);
    }
  };

  const displayName = user?.employee
    ? `${user.employee.first_name} ${user.employee.last_name || ""}`.trim()
    : user?.email?.split("@")[0] || "User";

  const userRole = user?.role || "EMPLOYEE";
  const orgName = user?.organization?.name || "HRM Enterprise";

  return (
    <>
      <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8 relative z-20">
        {/* Global Search Bar */}
        <div className="relative w-72 sm:w-96" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Search employees, depts, branches, docs..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-xs outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && searchResults && (
            <div className="absolute left-0 top-12 w-full max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 px-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>{searchResults.total_results} Results Found</span>
                {isSearching && <span className="animate-pulse text-indigo-600">Searching...</span>}
              </div>

              {searchResults.total_results === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No records found for "{searchQuery}"</div>
              ) : (
                <div className="space-y-3">
                  {/* Employees */}
                  {searchResults.results.employees.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                        <Users size={12} /> Employees
                      </p>
                      {searchResults.results.employees.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectSearchResult(item.page)}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 transition"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{item.title}</p>
                            <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            {item.status || "Active"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Departments */}
                  {searchResults.results.departments.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                        <Building2 size={12} /> Departments
                      </p>
                      {searchResults.results.departments.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectSearchResult(item.page)}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 transition"
                        >
                          <span className="font-semibold text-slate-800">{item.title}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-xs">{item.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Branches */}
                  {searchResults.results.branches.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                        <MapPin size={12} /> Branches
                      </p>
                      {searchResults.results.branches.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectSearchResult(item.page)}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 transition"
                        >
                          <span className="font-semibold text-slate-800">{item.title}</span>
                          <span className="text-[11px] text-indigo-600 font-medium">{item.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Documents & Announcements */}
                  {searchResults.results.documents.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                        <FileText size={12} /> Documents
                      </p>
                      {searchResults.results.documents.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectSearchResult(item.page)}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 transition"
                        >
                          <span className="font-semibold text-slate-800">{item.title}</span>
                          <span className="text-[10px] text-slate-400">{item.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Nav Icons & Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                setShowProfileMenu(false);
              }}
              title="Notifications"
              className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 transition"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">You're all caught up! No notifications.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link) onNavigate(n.link as Page);
                          setShowNotifDropdown(false);
                        }}
                        className={`flex items-start gap-3 p-3.5 text-left transition hover:bg-slate-50 cursor-pointer ${
                          !n.is_read ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            !n.is_read ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Bell size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-xs text-slate-900 truncate">{n.title}</p>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => handleMarkRead(n.id, e)}
                            title="Mark as read"
                            className="text-slate-400 hover:text-emerald-600 p-1 rounded"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-7 w-px bg-slate-200" />

          {/* User Profile Card & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifDropdown(false);
              }}
              className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm shadow-indigo-200">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{displayName}</p>
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-indigo-600 border border-indigo-200">
                    {userRole}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{orgName}</p>
              </div>
              <ChevronDown size={15} className="text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-13 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50">
                <div className="border-b border-slate-100 p-3 mb-1">
                  <p className="text-xs font-bold text-slate-900">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">Tenant</span>
                    <span className="text-[11px] font-bold text-slate-800">{orgName}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate("Self Service");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                  >
                    <UserRound size={15} className="text-slate-400" /> My Profile (ESS)
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                  >
                    <KeyRound size={15} className="text-slate-400" /> Change Password
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate("Audit Logs");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                  >
                    <History size={15} className="text-slate-400" /> Activity & Audit
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Change Password</h3>
                  <p className="text-xs text-slate-400">Update your account login credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {passError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 border border-rose-200">
                {passError}
              </div>
            )}
            {passSuccess && (
              <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200">
                {passSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {passLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
