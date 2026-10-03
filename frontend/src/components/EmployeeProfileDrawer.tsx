import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  X,
  User,
  MapPin,
  Briefcase,
  PhoneCall,
  Users,
  GraduationCap,
  Award,
  CreditCard,
  ShieldCheck,
  History,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Building,
  Sparkles,
} from "lucide-react";
import {
  getEmployeeProfile,
  addEmergencyContact,
  deleteEmergencyContact,
  addDependent,
  deleteDependent,
  addEducation,
  deleteEducation,
  addExperience,
  deleteExperience,
  addSkill,
  deleteSkill,
  addBankDetail,
  deleteBankDetail,
  updateStatutoryDetails,
  createEmployeeLoginAccount,
  type EmployeeProfile,
} from "../api/employees";

interface Props {
  employeeId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

type TabType =
  | "personal"
  | "contact_address"
  | "employment"
  | "emergency"
  | "dependents"
  | "education"
  | "experience"
  | "skills"
  | "banking"
  | "statutory"
  | "history"
  | "attendance_leave"
  | "security";

export default function EmployeeProfileDrawer({
  employeeId,
  onClose,
  onUpdated,
}: Props) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("personal");

  // Form states for adding items
  const [showAddEmergency, setShowAddEmergency] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({
    name: "",
    relationship: "",
    phone: "",
    alternate_phone: "",
    email: "",
    address: "",
    is_primary: false,
  });

  const [showAddDependent, setShowAddDependent] = useState(false);
  const [dependentForm, setDependentForm] = useState({
    name: "",
    relationship: "",
    date_of_birth: "",
    gender: "Male",
    phone: "",
    email: "",
    is_dependent: true,
    is_nominee: false,
  });

  const [showAddEducation, setShowAddEducation] = useState(false);
  const [educationForm, setEducationForm] = useState({
    degree: "",
    institution: "",
    field_of_study: "",
    start_year: "",
    end_year: "",
    grade: "",
    document_url: "",
  });

  const [showAddExperience, setShowAddExperience] = useState(false);
  const [experienceForm, setExperienceForm] = useState({
    company_name: "",
    designation: "",
    start_date: "",
    end_date: "",
    employment_type: "Full-Time",
    last_drawn_salary: "",
    reason_for_leaving: "",
    document_url: "",
  });

  const [showAddSkill, setShowAddSkill] = useState(false);
  const [skillForm, setSkillForm] = useState({
    skill_name: "",
    proficiency_level: "Intermediate",
    years_of_experience: "",
    certification_name: "",
    certification_expiry: "",
  });

  const [showAddBank, setShowAddBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: "",
    account_type: "Savings",
    is_primary: true,
  });

  // Statutory form state
  const [statutoryForm, setStatutoryForm] = useState({
    pan_number: "",
    aadhaar_number: "",
    uan_number: "",
    pf_number: "",
    esi_number: "",
    professional_tax_state: "",
    tax_regime: "New",
  });

  // Account creation state
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState("EMPLOYEE");
  const [accountMsg, setAccountMsg] = useState("");

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const p = await getEmployeeProfile(employeeId);
      setProfile(p);
      if (p.statutory_details) {
        setStatutoryForm({
          pan_number: p.statutory_details.pan_number || "",
          aadhaar_number: p.statutory_details.aadhaar_number || "",
          uan_number: p.statutory_details.uan_number || "",
          pf_number: p.statutory_details.pf_number || "",
          esi_number: p.statutory_details.esi_number || "",
          professional_tax_state: p.statutory_details.professional_tax_state || "",
          tax_regime: p.statutory_details.tax_regime || "New",
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load employee profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, [employeeId]);

  function notify(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  // Emergency contact handlers
  async function handleAddEmergencyContact(e: FormEvent) {
    e.preventDefault();
    try {
      await addEmergencyContact(employeeId, {
        ...emergencyForm,
        alternate_phone: emergencyForm.alternate_phone || null,
        email: emergencyForm.email || null,
        address: emergencyForm.address || null,
      });
      setShowAddEmergency(false);
      setEmergencyForm({
        name: "",
        relationship: "",
        phone: "",
        alternate_phone: "",
        email: "",
        address: "",
        is_primary: false,
      });
      notify("Emergency contact added!");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to add emergency contact.");
    }
  }

  async function handleDeleteEmergencyContact(id: string) {
    if (!window.confirm("Remove this emergency contact?")) return;
    try {
      await deleteEmergencyContact(employeeId, id);
      notify("Emergency contact removed.");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete emergency contact.");
    }
  }

  // Dependents handlers
  async function handleAddDependent(e: FormEvent) {
    e.preventDefault();
    try {
      await addDependent(employeeId, {
        ...dependentForm,
        date_of_birth: dependentForm.date_of_birth || null,
        phone: dependentForm.phone || null,
        email: dependentForm.email || null,
      });
      setShowAddDependent(false);
      setDependentForm({
        name: "",
        relationship: "",
        date_of_birth: "",
        gender: "Male",
        phone: "",
        email: "",
        is_dependent: true,
        is_nominee: false,
      });
      notify("Dependent record added!");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to add dependent.");
    }
  }

  async function handleDeleteDependent(id: string) {
    if (!window.confirm("Remove this dependent?")) return;
    try {
      await deleteDependent(employeeId, id);
      notify("Dependent removed.");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete dependent.");
    }
  }

  // Education handlers
  async function handleAddEducation(e: FormEvent) {
    e.preventDefault();
    try {
      await addEducation(employeeId, {
        ...educationForm,
        field_of_study: educationForm.field_of_study || null,
        start_year: educationForm.start_year || null,
        end_year: educationForm.end_year || null,
        grade: educationForm.grade || null,
        document_url: educationForm.document_url || null,
      });
      setShowAddEducation(false);
      setEducationForm({
        degree: "",
        institution: "",
        field_of_study: "",
        start_year: "",
        end_year: "",
        grade: "",
        document_url: "",
      });
      notify("Education record added!");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to add education.");
    }
  }

  async function handleDeleteEducation(id: string) {
    if (!window.confirm("Remove this education entry?")) return;
    try {
      await deleteEducation(employeeId, id);
      notify("Education record removed.");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete education.");
    }
  }

  // Experience handlers
  async function handleAddExperience(e: FormEvent) {
    e.preventDefault();
    try {
      await addExperience(employeeId, {
        ...experienceForm,
        start_date: experienceForm.start_date || null,
        end_date: experienceForm.end_date || null,
        last_drawn_salary: experienceForm.last_drawn_salary
          ? parseFloat(experienceForm.last_drawn_salary)
          : null,
        reason_for_leaving: experienceForm.reason_for_leaving || null,
        document_url: experienceForm.document_url || null,
      });
      setShowAddExperience(false);
      setExperienceForm({
        company_name: "",
        designation: "",
        start_date: "",
        end_date: "",
        employment_type: "Full-Time",
        last_drawn_salary: "",
        reason_for_leaving: "",
        document_url: "",
      });
      notify("Work experience added!");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to add experience.");
    }
  }

  async function handleDeleteExperience(id: string) {
    if (!window.confirm("Remove this experience entry?")) return;
    try {
      await deleteExperience(employeeId, id);
      notify("Work experience removed.");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete experience.");
    }
  }

  // Skills handlers
  async function handleAddSkill(e: FormEvent) {
    e.preventDefault();
    try {
      await addSkill(employeeId, {
        ...skillForm,
        years_of_experience: skillForm.years_of_experience
          ? parseFloat(skillForm.years_of_experience)
          : null,
        certification_name: skillForm.certification_name || null,
        certification_expiry: skillForm.certification_expiry || null,
      });
      setShowAddSkill(false);
      setSkillForm({
        skill_name: "",
        proficiency_level: "Intermediate",
        years_of_experience: "",
        certification_name: "",
        certification_expiry: "",
      });
      notify("Skill added!");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to add skill.");
    }
  }

  async function handleDeleteSkill(id: string) {
    if (!window.confirm("Remove this skill?")) return;
    try {
      await deleteSkill(employeeId, id);
      notify("Skill removed.");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete skill.");
    }
  }

  // Bank details handlers
  async function handleAddBankDetail(e: FormEvent) {
    e.preventDefault();
    try {
      await addBankDetail(employeeId, {
        ...bankForm,
        branch_name: bankForm.branch_name || null,
      });
      setShowAddBank(false);
      setBankForm({
        bank_name: "",
        account_holder_name: "",
        account_number: "",
        ifsc_code: "",
        branch_name: "",
        account_type: "Savings",
        is_primary: true,
      });
      notify("Bank account saved!");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to add bank details.");
    }
  }

  async function handleDeleteBankDetail(id: string) {
    if (!window.confirm("Remove this bank account?")) return;
    try {
      await deleteBankDetail(employeeId, id);
      notify("Bank account removed.");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete bank details.");
    }
  }

  // Statutory save handler
  async function handleSaveStatutory(e: FormEvent) {
    e.preventDefault();
    try {
      await updateStatutoryDetails(employeeId, statutoryForm);
      notify("Statutory & tax details updated!");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update statutory details.");
    }
  }

  // Account creation handler
  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
    if (!accountPassword) return;
    try {
      const res = await createEmployeeLoginAccount(employeeId, accountPassword, accountRole);
      setAccountMsg(res.message);
      notify("Login credentials provisioned!");
      await loadProfile();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create portal account.");
    }
  }

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "contact_address", label: "Contact & Address", icon: MapPin },
    { id: "employment", label: "Job & Organization", icon: Briefcase },
    { id: "emergency", label: `Emergency Contacts (${profile?.emergency_contacts?.length ?? 0})`, icon: PhoneCall },
    { id: "dependents", label: `Family & Nominees (${profile?.dependents?.length ?? 0})`, icon: Users },
    { id: "education", label: `Education (${profile?.educations?.length ?? 0})`, icon: GraduationCap },
    { id: "experience", label: `Experience (${profile?.experiences?.length ?? 0})`, icon: Award },
    { id: "skills", label: `Skills (${profile?.skills?.length ?? 0})`, icon: Sparkles },
    { id: "banking", label: `Bank Accounts (${profile?.bank_details?.length ?? 0})`, icon: CreditCard },
    { id: "statutory", label: "Statutory & Tax", icon: ShieldCheck },
    { id: "history", label: `Career Timeline (${profile?.employment_history?.length ?? 0})`, icon: History },
    { id: "security", label: "Portal Access", icon: Lock },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-base font-black text-white shadow-md">
              {profile
                ? `${profile.first_name[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
                : "HR"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {profile ? `${profile.first_name} ${profile.middle_name ? profile.middle_name + " " : ""}${profile.last_name ?? ""}` : "Loading Employee..."}
                </h2>
                {profile && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-mono font-bold text-indigo-700">
                    {profile.employee_code}
                  </span>
                )}
                {profile && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      profile.employment_status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {profile.employment_status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{profile?.designation_name || "No Designation"}</span>
                <span>•</span>
                <span>{profile?.department_name || "No Department"}</span>
                <span>•</span>
                <span>{profile?.work_email || profile?.email || "No Email"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Banner Messages */}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-6 py-1 scrollbar-none gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition ${
                  active
                    ? "bg-indigo-50 text-indigo-600 font-bold"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              Loading full employee dossier...
            </div>
          ) : !profile ? (
            <div className="p-8 text-center text-xs text-slate-400">Employee record not found.</div>
          ) : (
            <>
              {/* TAB 1: Personal Information */}
              {activeTab === "personal" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <User size={16} className="text-indigo-600" /> Identity & Demographics
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">First Name</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.first_name}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Middle Name</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.middle_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Last Name</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.last_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Preferred Name</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.preferred_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Gender</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.gender || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Date of Birth</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.date_of_birth || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Blood Group</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.blood_group || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Marital Status</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.marital_status || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Nationality</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.nationality || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Contact & Addresses */}
              {activeTab === "contact_address" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <PhoneCall size={16} className="text-indigo-600" /> Communications
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Work Email (Primary)</label>
                        <p className="text-xs font-bold text-indigo-700 mt-0.5">{profile.work_email || profile.email || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Personal Email</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.personal_email || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Work Phone</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.work_phone || profile.phone || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Personal Phone</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.personal_phone || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Current Address */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-600" /> Current Address
                      </h3>
                      <p className="text-xs text-slate-700 whitespace-pre-line font-medium">
                        {profile.current_address || "No address specified."}
                      </p>
                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-400">City:</span> <span className="font-semibold text-slate-800">{profile.current_city || "—"}</span></div>
                        <div><span className="text-slate-400">State:</span> <span className="font-semibold text-slate-800">{profile.current_state || "—"}</span></div>
                        <div><span className="text-slate-400">Country:</span> <span className="font-semibold text-slate-800">{profile.current_country || "—"}</span></div>
                        <div><span className="text-slate-400">Pincode:</span> <span className="font-semibold text-slate-800">{profile.current_pincode || "—"}</span></div>
                      </div>
                    </div>

                    {/* Permanent Address */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Building size={16} className="text-indigo-600" /> Permanent Address
                      </h3>
                      <p className="text-xs text-slate-700 whitespace-pre-line font-medium">
                        {profile.current_same_as_permanent
                          ? "(Same as current address)"
                          : profile.permanent_address || "No address specified."}
                      </p>
                      {!profile.current_same_as_permanent && (
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                          <div><span className="text-slate-400">City:</span> <span className="font-semibold text-slate-800">{profile.permanent_city || "—"}</span></div>
                          <div><span className="text-slate-400">State:</span> <span className="font-semibold text-slate-800">{profile.permanent_state || "—"}</span></div>
                          <div><span className="text-slate-400">Country:</span> <span className="font-semibold text-slate-800">{profile.permanent_country || "—"}</span></div>
                          <div><span className="text-slate-400">Pincode:</span> <span className="font-semibold text-slate-800">{profile.permanent_pincode || "—"}</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Job & Organization */}
              {activeTab === "employment" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Briefcase size={16} className="text-indigo-600" /> Organizational Placement
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Department</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.department_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Designation</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.designation_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Branch Location</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.branch_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Assigned Team</label>
                        <p className="text-xs font-bold text-indigo-700 mt-0.5">{profile.team_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Reporting Manager</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.reporting_manager_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">HR Manager</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.hr_manager_name || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-600" /> Terms of Employment
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Employment Type</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.employment_type || "Full-Time"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Employment Status</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5 uppercase">{profile.employment_status}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Joining Date</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.joining_date || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Confirmation Date</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.confirmation_date || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Weekly Off</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.weekly_off || "Saturday, Sunday"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Notice Period</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.notice_period_days ? `${profile.notice_period_days} Days` : "30 Days"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Probation Period</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.probation_period_days ? `${profile.probation_period_days} Days` : "90 Days"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Probation End Date</label>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{profile.probation_end_date || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Last Working Day</label>
                        <p className="text-xs font-bold text-rose-600 mt-0.5">{profile.last_working_day || "Active"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Emergency Contacts */}
              {activeTab === "emergency" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Emergency Contacts Directory</h3>
                    <button
                      onClick={() => setShowAddEmergency(!showAddEmergency)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
                    >
                      <Plus size={14} /> Add Contact
                    </button>
                  </div>

                  {showAddEmergency && (
                    <form onSubmit={handleAddEmergencyContact} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Contact Name *</label>
                          <input required type="text" value={emergencyForm.name} onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Relationship *</label>
                          <input required type="text" placeholder="e.g. Spouse, Father" value={emergencyForm.relationship} onChange={(e) => setEmergencyForm({ ...emergencyForm, relationship: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Phone Number *</label>
                          <input required type="text" value={emergencyForm.phone} onChange={(e) => setEmergencyForm({ ...emergencyForm, phone: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Alternate Phone</label>
                          <input type="text" value={emergencyForm.alternate_phone} onChange={(e) => setEmergencyForm({ ...emergencyForm, alternate_phone: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Email Address</label>
                          <input type="email" value={emergencyForm.email} onChange={(e) => setEmergencyForm({ ...emergencyForm, email: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input type="checkbox" checked={emergencyForm.is_primary} onChange={(e) => setEmergencyForm({ ...emergencyForm, is_primary: e.target.checked })} className="rounded text-indigo-600" />
                            Primary Contact
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowAddEmergency(false)} className="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">Cancel</button>
                        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Save Contact</button>
                      </div>
                    </form>
                  )}

                  {profile.emergency_contacts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No emergency contacts recorded.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {profile.emergency_contacts.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs text-slate-900">{c.name}</p>
                              {c.is_primary && (
                                <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">Primary</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{c.relationship}</p>
                            <p className="text-xs font-mono text-slate-800 mt-1 font-semibold">{c.phone}</p>
                            {c.email && <p className="text-[11px] text-slate-400">{c.email}</p>}
                          </div>
                          <button onClick={() => handleDeleteEmergencyContact(c.id)} className="text-slate-400 hover:text-red-600 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Family & Nominees */}
              {activeTab === "dependents" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Family Members & Nominees</h3>
                    <button
                      onClick={() => setShowAddDependent(!showAddDependent)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
                    >
                      <Plus size={14} /> Add Member
                    </button>
                  </div>

                  {showAddDependent && (
                    <form onSubmit={handleAddDependent} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Full Name *</label>
                          <input required type="text" value={dependentForm.name} onChange={(e) => setDependentForm({ ...dependentForm, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Relationship *</label>
                          <input required type="text" placeholder="Spouse, Child, Parent" value={dependentForm.relationship} onChange={(e) => setDependentForm({ ...dependentForm, relationship: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Date of Birth</label>
                          <input type="date" value={dependentForm.date_of_birth} onChange={(e) => setDependentForm({ ...dependentForm, date_of_birth: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Gender</label>
                          <select value={dependentForm.gender} onChange={(e) => setDependentForm({ ...dependentForm, gender: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-4 sm:col-span-2">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input type="checkbox" checked={dependentForm.is_dependent} onChange={(e) => setDependentForm({ ...dependentForm, is_dependent: e.target.checked })} className="rounded text-indigo-600" />
                            Claim as Dependent
                          </label>
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input type="checkbox" checked={dependentForm.is_nominee} onChange={(e) => setDependentForm({ ...dependentForm, is_nominee: e.target.checked })} className="rounded text-indigo-600" />
                            Designate as Nominee
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowAddDependent(false)} className="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">Cancel</button>
                        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Save</button>
                      </div>
                    </form>
                  )}

                  {profile.dependents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No family or nominees on record.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {profile.dependents.map((d) => (
                        <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs text-slate-900">{d.name}</p>
                              {d.is_nominee && <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold">Nominee</span>}
                              {d.is_dependent && <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-bold">Dependent</span>}
                            </div>
                            <p className="text-[11px] text-slate-500">{d.relationship} · {d.gender || "—"}</p>
                            {d.date_of_birth && <p className="text-[11px] text-slate-400">DOB: {d.date_of_birth}</p>}
                          </div>
                          <button onClick={() => handleDeleteDependent(d.id)} className="text-slate-400 hover:text-red-600 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: Education */}
              {activeTab === "education" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Education & Academic Qualifications</h3>
                    <button
                      onClick={() => setShowAddEducation(!showAddEducation)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
                    >
                      <Plus size={14} /> Add Degree
                    </button>
                  </div>

                  {showAddEducation && (
                    <form onSubmit={handleAddEducation} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Degree / Qualification *</label>
                          <input required type="text" placeholder="e.g. B.Tech Computer Science" value={educationForm.degree} onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Institution / University *</label>
                          <input required type="text" value={educationForm.institution} onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Field of Study</label>
                          <input type="text" value={educationForm.field_of_study} onChange={(e) => setEducationForm({ ...educationForm, field_of_study: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Start / End Year</label>
                          <div className="flex gap-1">
                            <input type="text" placeholder="2018" value={educationForm.start_year} onChange={(e) => setEducationForm({ ...educationForm, start_year: e.target.value })} className="w-1/2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs" />
                            <input type="text" placeholder="2022" value={educationForm.end_year} onChange={(e) => setEducationForm({ ...educationForm, end_year: e.target.value })} className="w-1/2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Grade / GPA</label>
                          <input type="text" placeholder="e.g. 8.5 CGPA or First Class" value={educationForm.grade} onChange={(e) => setEducationForm({ ...educationForm, grade: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowAddEducation(false)} className="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">Cancel</button>
                        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Save</button>
                      </div>
                    </form>
                  )}

                  {profile.educations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No educational records added.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profile.educations.map((ed) => (
                        <div key={ed.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-slate-900">{ed.degree}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{ed.institution} {ed.field_of_study ? `· ${ed.field_of_study}` : ""}</p>
                            <p className="text-[10px] text-slate-400">{ed.start_year || ""} - {ed.end_year || "Present"} {ed.grade ? `· Grade: ${ed.grade}` : ""}</p>
                          </div>
                          <button onClick={() => handleDeleteEducation(ed.id)} className="text-slate-400 hover:text-red-600 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: Work Experience */}
              {activeTab === "experience" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Previous Employment & Experience</h3>
                    <button
                      onClick={() => setShowAddExperience(!showAddExperience)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
                    >
                      <Plus size={14} /> Add Experience
                    </button>
                  </div>

                  {showAddExperience && (
                    <form onSubmit={handleAddExperience} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Company Name *</label>
                          <input required type="text" value={experienceForm.company_name} onChange={(e) => setExperienceForm({ ...experienceForm, company_name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Designation *</label>
                          <input required type="text" value={experienceForm.designation} onChange={(e) => setExperienceForm({ ...experienceForm, designation: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Last Drawn Salary (CTC)</label>
                          <input type="number" placeholder="Annual CTC" value={experienceForm.last_drawn_salary} onChange={(e) => setExperienceForm({ ...experienceForm, last_drawn_salary: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Start Date</label>
                          <input type="date" value={experienceForm.start_date} onChange={(e) => setExperienceForm({ ...experienceForm, start_date: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">End Date</label>
                          <input type="date" value={experienceForm.end_date} onChange={(e) => setExperienceForm({ ...experienceForm, end_date: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Reason for Leaving</label>
                          <input type="text" value={experienceForm.reason_for_leaving} onChange={(e) => setExperienceForm({ ...experienceForm, reason_for_leaving: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowAddExperience(false)} className="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">Cancel</button>
                        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Save</button>
                      </div>
                    </form>
                  )}

                  {profile.experiences.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No previous experience entries on record.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profile.experiences.map((ex) => (
                        <div key={ex.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-slate-900">{ex.designation} · {ex.company_name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{ex.start_date || "—"} to {ex.end_date || "Present"} {ex.employment_type ? `(${ex.employment_type})` : ""}</p>
                            {ex.reason_for_leaving && <p className="text-[10px] text-slate-400">Reason: {ex.reason_for_leaving}</p>}
                          </div>
                          <button onClick={() => handleDeleteExperience(ex.id)} className="text-slate-400 hover:text-red-600 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: Skills */}
              {activeTab === "skills" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Skills, Competencies & Certifications</h3>
                    <button
                      onClick={() => setShowAddSkill(!showAddSkill)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
                    >
                      <Plus size={14} /> Add Skill
                    </button>
                  </div>

                  {showAddSkill && (
                    <form onSubmit={handleAddSkill} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Skill Name *</label>
                          <input required type="text" placeholder="e.g. Python, Financial Modeling" value={skillForm.skill_name} onChange={(e) => setSkillForm({ ...skillForm, skill_name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Proficiency Level</label>
                          <select value={skillForm.proficiency_level} onChange={(e) => setSkillForm({ ...skillForm, proficiency_level: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs">
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Expert">Expert</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Years of Experience</label>
                          <input type="number" step="0.5" value={skillForm.years_of_experience} onChange={(e) => setSkillForm({ ...skillForm, years_of_experience: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Certification Name</label>
                          <input type="text" placeholder="AWS Solution Architect" value={skillForm.certification_name} onChange={(e) => setSkillForm({ ...skillForm, certification_name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Certificate Expiry</label>
                          <input type="date" value={skillForm.certification_expiry} onChange={(e) => setSkillForm({ ...skillForm, certification_expiry: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowAddSkill(false)} className="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">Cancel</button>
                        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Save</button>
                      </div>
                    </form>
                  )}

                  {profile.skills.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No skills added yet.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {profile.skills.map((sk) => (
                        <div key={sk.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs text-slate-900">{sk.skill_name}</p>
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">{sk.proficiency_level}</span>
                            </div>
                            {sk.years_of_experience && <p className="text-[11px] text-slate-500">{sk.years_of_experience} yrs experience</p>}
                            {sk.certification_name && <p className="text-[10px] text-indigo-600 font-semibold mt-1">Certified: {sk.certification_name}</p>}
                          </div>
                          <button onClick={() => handleDeleteSkill(sk.id)} className="text-slate-400 hover:text-red-600 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 9: Bank Accounts */}
              {activeTab === "banking" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Direct Deposit & Banking Accounts</h3>
                    <button
                      onClick={() => setShowAddBank(!showAddBank)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
                    >
                      <Plus size={14} /> Add Bank Account
                    </button>
                  </div>

                  {showAddBank && (
                    <form onSubmit={handleAddBankDetail} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Bank Name *</label>
                          <input required type="text" placeholder="e.g. HDFC Bank" value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Account Holder Name *</label>
                          <input required type="text" value={bankForm.account_holder_name} onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Account Number *</label>
                          <input required type="text" value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">IFSC / Routing Code *</label>
                          <input required type="text" value={bankForm.ifsc_code} onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value.toUpperCase() })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Branch Name</label>
                          <input type="text" value={bankForm.branch_name} onChange={(e) => setBankForm({ ...bankForm, branch_name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" />
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input type="checkbox" checked={bankForm.is_primary} onChange={(e) => setBankForm({ ...bankForm, is_primary: e.target.checked })} className="rounded text-indigo-600" />
                            Primary Salary Account
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowAddBank(false)} className="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">Cancel</button>
                        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Save Account</button>
                      </div>
                    </form>
                  )}

                  {profile.bank_details.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No banking details configured.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {profile.bank_details.map((b) => (
                        <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs text-slate-900">{b.bank_name}</p>
                              {b.is_primary && (
                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">Salary Account</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">A/C: {b.account_number} · Holder: {b.account_holder_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">IFSC: {b.ifsc_code} {b.branch_name ? `(${b.branch_name})` : ""}</p>
                          </div>
                          <button onClick={() => handleDeleteBankDetail(b.id)} className="text-slate-400 hover:text-red-600 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 10: Statutory & Tax Compliance */}
              {activeTab === "statutory" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-indigo-600" /> Government & Tax Identifiers
                    </h3>
                    <form onSubmit={handleSaveStatutory} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">PAN Number</label>
                          <input type="text" placeholder="ABCDE1234F" value={statutoryForm.pan_number} onChange={(e) => setStatutoryForm({ ...statutoryForm, pan_number: e.target.value.toUpperCase() })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Aadhaar Number</label>
                          <input type="text" placeholder="1234-5678-9012" value={statutoryForm.aadhaar_number} onChange={(e) => setStatutoryForm({ ...statutoryForm, aadhaar_number: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">UAN (Universal Account Number)</label>
                          <input type="text" value={statutoryForm.uan_number} onChange={(e) => setStatutoryForm({ ...statutoryForm, uan_number: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Provident Fund (PF) Number</label>
                          <input type="text" value={statutoryForm.pf_number} onChange={(e) => setStatutoryForm({ ...statutoryForm, pf_number: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">ESI Number</label>
                          <input type="text" value={statutoryForm.esi_number} onChange={(e) => setStatutoryForm({ ...statutoryForm, esi_number: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Professional Tax (PT) State</label>
                          <input type="text" placeholder="e.g. Maharashtra, Karnataka" value={statutoryForm.professional_tax_state} onChange={(e) => setStatutoryForm({ ...statutoryForm, professional_tax_state: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Tax Regime</label>
                          <select value={statutoryForm.tax_regime} onChange={(e) => setStatutoryForm({ ...statutoryForm, tax_regime: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs">
                            <option value="New">New Tax Regime (Default)</option>
                            <option value="Old">Old Tax Regime</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2 border-t border-slate-100">
                        <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700">
                          Save Statutory Details
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 11: Career Timeline / Employment History */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Employment & Career Movement Timeline</h3>
                  {profile.employment_history.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No career change events logged yet.
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6">
                      {profile.employment_history.map((h) => (
                        <div key={h.id} className="relative">
                          <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                                {h.event_type.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(h.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="mt-2 text-xs">
                              {h.old_value && <span className="text-slate-400 line-through mr-2">{h.old_value}</span>}
                              {h.new_value && <span className="font-bold text-slate-900">{h.new_value}</span>}
                            </div>
                            {h.reason && <p className="text-[11px] text-slate-500 mt-1">Reason: {h.reason}</p>}
                            {h.changed_by_name && (
                              <p className="text-[10px] text-slate-400 mt-1">Logged by: {h.changed_by_name}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 12: Security & Portal Access */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Lock size={16} className="text-indigo-600" /> Employee Self-Service (ESS) Portal Access
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Manage login credentials, active status, and access roles for the web portal.
                    </p>

                    {accountMsg && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-4 text-xs font-semibold text-emerald-700">
                        {accountMsg}
                      </div>
                    )}

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 mb-4 text-xs space-y-2">
                      <p><span className="text-slate-400 font-semibold">User Account:</span> <span className="font-bold text-slate-900">{profile.user_id ? "Active Linked Account" : "No Login Account"}</span></p>
                      <p><span className="text-slate-400 font-semibold">Login Email:</span> <span className="font-bold text-indigo-700">{profile.work_email || profile.email || "No email assigned"}</span></p>
                      <p><span className="text-slate-400 font-semibold">Current Role:</span> <span className="font-bold text-slate-800">{profile.user_role || "EMPLOYEE"}</span></p>
                    </div>

                    <form onSubmit={handleCreateAccount} className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Set New Password</label>
                          <input
                            required
                            type="text"
                            placeholder="Enter new password"
                            value={accountPassword}
                            onChange={(e) => setAccountPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700">Assign Portal Role</label>
                          <select
                            value={accountRole}
                            onChange={(e) => setAccountRole(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          >
                            <option value="EMPLOYEE">Employee (ESS Portal)</option>
                            <option value="MANAGER">Manager (Team Portal + ESS)</option>
                            <option value="HR">HR Specialist</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                        >
                          {profile.user_id ? "Reset Password / Update Role" : "Provision Login Account"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
