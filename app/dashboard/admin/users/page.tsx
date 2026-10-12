"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import AdminNav from "@/components/AdminNav";
import Dialog from "@/components/Dialog";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  RefreshCw,
  Power,
  GraduationCap,
  Briefcase,
  Shield,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
} from "lucide-react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fetching, setFetching] = useState(false);

  // Create User Dialog
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("STUDENT");
  const [creating, setCreating] = useState(false);

  // Status Dialog
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "danger";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  useEffect(() => {
    const stored = getStoredUser();
    // Security check: Only ADMIN role allowed
    if (!stored || stored.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(stored);

    // Try Smart Cache First
    const cachedUsers = smartCache.get<any[]>("/admin/users");
    if (cachedUsers?.data) {
      setUsers(cachedUsers.data);
      setLoading(false);
    }

    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    setFetching(true);
    try {
      let query = "";
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      if (searchTerm) params.append("search", searchTerm);
      if (params.toString()) query = `?${params.toString()}`;

      const res = await apiFetch(`/admin/users${query}`);
      const userList = res.data?.users || res.data || [];
      setUsers(userList);

      if (!roleFilter && !searchTerm) {
        smartCache.set("/admin/users", userList);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    setCreating(true);

    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole,
        }),
      });

      // Invalidate users & admin dashboard caches
      smartCache.invalidate("/admin/users*");
      smartCache.invalidate("/dashboards/admin");

      setCreateModal(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setDialog({
        isOpen: true,
        title: "تم إنشاء الحساب بنجاح",
        message: `تم إنشاء حساب ${newRole === "DOCTOR" ? "التدريسي" : newRole === "ADMIN" ? "مدير النظام" : "الطالب"} وتوليد الهوية الأكاديمية بنجاح.`,
        type: "success",
      });

      loadUsers();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "فشل إنشاء الحساب",
        message: err.message || "تأكد من عدم تكرار البريد الإلكتروني وقوة كلمة المرور.",
        type: "danger",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (targetUser: any) => {
    const newStatus = targetUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await apiFetch(`/admin/users/${targetUser._id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      // Invalidate users cache
      smartCache.invalidate("/admin/users*");

      setDialog({
        isOpen: true,
        title: "تم تحديث حالة الحساب",
        message: `تم تعديل حالة حساب (${targetUser.name}) إلى ${newStatus === "ACTIVE" ? "نشط ومفعل" : "معلق وموقوف"}.`,
        type: "success",
      });

      loadUsers();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في تعديل الحالة",
        message: err.message || "تعذر تعديل حالة المستخدم.",
        type: "danger",
      });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchSearch =
        !searchTerm.trim() ||
        (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col" dir="rtl">
      <AdminNav user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/admin" className="hover:text-[#14352c] transition">
                لوحة الإدارة
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">إدارة الحسابات والمستخدمين</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Users className="w-7 h-7 text-[#14352c]" />
              إدارة الحسابات والصلاحيات الجامعية
            </h1>
            <p className="text-sm text-slate-600">
              تسجيل حسابات الطلبة والتدريسيين، تعيين الصلاحيات، وإدارة النشاط الأمني
            </p>
          </div>

          <button
            onClick={() => setCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            إضافة مستخدم جديد
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن الاسم أو البريد الجامعي الرسمي..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setRoleFilter("")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex-1 md:flex-initial ${
                roleFilter === ""
                  ? "bg-[#14352c] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              الكل ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter("STUDENT")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex-1 md:flex-initial ${
                roleFilter === "STUDENT"
                  ? "bg-[#14352c] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              الطلبة
            </button>
            <button
              onClick={() => setRoleFilter("DOCTOR")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex-1 md:flex-initial ${
                roleFilter === "DOCTOR"
                  ? "bg-[#14352c] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              التدريسيين
            </button>
            <button
              onClick={() => setRoleFilter("ADMIN")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex-1 md:flex-initial ${
                roleFilter === "ADMIN"
                  ? "bg-[#14352c] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              المسؤولين
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {fetching ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
              <p className="text-xs text-slate-500 font-medium">جارٍ تحديث قائمة الحسابات...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">لا يوجد مستخدمين مطابقين للبحث</h4>
              <p className="text-xs text-slate-500">تأكد من شروط التصفية أو أضف مستخدمًا جديدًا.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">المستخدم والبريد الرسمي</th>
                    <th className="py-3.5 px-4">الدور والصلاحية</th>
                    <th className="py-3.5 px-4">حالة الحساب</th>
                    <th className="py-3.5 px-4 text-center">التحكم والنشاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u, idx) => (
                    <tr key={u._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-[#14352c]/10 text-[#14352c] font-bold flex items-center justify-center shrink-0">
                            {u.name ? u.name[0] : "م"}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900">{u.name}</h5>
                            <span className="text-[11px] text-slate-500 font-mono block">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 ${
                            u.role === "ADMIN"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : u.role === "DOCTOR"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {u.role === "ADMIN" && <Shield className="w-3 h-3" />}
                          {u.role === "DOCTOR" && <Briefcase className="w-3 h-3" />}
                          {u.role === "STUDENT" && <GraduationCap className="w-3 h-3" />}
                          {u.role === "ADMIN" ? "مسؤول نظام" : u.role === "DOCTOR" ? "تدريسي" : "طالب"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.status === "ACTIVE"
                              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                              : "text-rose-700 bg-rose-50 border border-rose-200"
                          }`}
                        >
                          {u.status === "ACTIVE" ? "نشط ومفعل" : "معلق وموقوف"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                            u.status === "ACTIVE"
                              ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {u.status === "ACTIVE" ? "إيقاف الحساب" : "تفعيل الحساب"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create User Dialog */}
      <Dialog
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="إنشاء حساب أكاديمي جديد"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الثلاثي الكامل:</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: د. زيد خليل إبراهيم..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الجامعي الرسمي:</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@uomustansiriyah.edu.iq"
              dir="ltr"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الأولية:</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الدور والصلاحية الأكاديمية:</label>
            <CustomSelect
              options={[
                { value: "STUDENT", label: "طالب جامعي (Student)" },
                { value: "DOCTOR", label: "أستاذ / تدريسي (Doctor)" },
                { value: "ADMIN", label: "مسؤول إدارة / رئيس قسم (Admin)" },
              ]}
              value={newRole}
              onChange={(val) => setNewRole(val)}
              theme="light"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              تأكيد إنشاء الحساب
            </button>
          </div>
        </form>
      </Dialog>

      {/* Status Feedback Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        type={dialog.type}
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-700 font-medium">{dialog.message}</p>
          <button
            onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
            className="w-full py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </Dialog>
    </div>
  );
}
