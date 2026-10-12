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
  Building2,
  BookOpen,
  Layers,
  Plus,
  RefreshCw,
  Users,
  CheckCircle2,
  ShieldCheck,
  ChevronLeft,
  Building,
  GraduationCap,
} from "lucide-react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function AdminAcademicPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab with workspace memory
  const [activeTab, setActiveTab] = useState<"departments" | "courses" | "sections">("departments");

  // Data states
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  // Create Modals
  const [deptModal, setDeptModal] = useState(false);
  const [courseModal, setCourseModal] = useState(false);
  const [sectionModal, setSectionModal] = useState(false);

  // Form states
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptCollege, setDeptCollege] = useState("كلية العلوم");

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseCredits, setCourseCredits] = useState(3);
  const [courseStage, setCourseStage] = useState(1);
  const [courseDept, setCourseDept] = useState("");

  const [secCourse, setSecCourse] = useState("");
  const [secDoctor, setSecDoctor] = useState("");
  const [secNumber, setSecNumber] = useState("A1");
  const [secCapacity, setSecCapacity] = useState(50);
  const [secSemester, setSecSemester] = useState("FIRST");
  const [secYear, setSecYear] = useState("2025-2026");

  const [submitting, setSubmitting] = useState(false);

  const stageOptions: SelectOption[] = [
    { value: "1", label: "المرحلة 1" },
    { value: "2", label: "المرحلة 2" },
    { value: "3", label: "المرحلة 3" },
    { value: "4", label: "المرحلة 4" },
  ];

  const departmentOptions: SelectOption[] = useMemo(() => {
    return departments.map((d: any) => ({
      value: d._id,
      label: `${d.name} (${d.code})`,
    }));
  }, [departments]);

  const courseSelectOptions: SelectOption[] = useMemo(() => {
    return courses.map((c: any) => ({
      value: c._id,
      label: `${c.name} (${c.code}) - المرحلة ${c.stage || 1}`,
    }));
  }, [courses]);

  const doctorSelectOptions: SelectOption[] = useMemo(() => {
    return doctors.map((d: any) => ({
      value: d._id,
      label: `${d.name} (${d.email})`,
    }));
  }, [doctors]);

  // Dialog feedback
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

    // Restore persisted tab from workspace memory
    const rememberedTab = smartCache.getWorkspace("admin_academic_tab", "departments");
    if (rememberedTab === "departments" || rememberedTab === "courses" || rememberedTab === "sections") {
      setActiveTab(rememberedTab);
    }

    loadAllAcademicData();
  }, [router]);

  const loadAllAcademicData = async () => {
    setFetching(true);
    try {
      // 1. Try Smart Cache First
      const cachedDepts = smartCache.get<any[]>("/academic/departments");
      const cachedCourses = smartCache.get<any[]>("/academic/courses");
      const cachedSections = smartCache.get<any[]>("/academic/sections");
      const cachedDoctors = smartCache.get<any>("/admin/users?role=DOCTOR");

      if (cachedDepts?.data) setDepartments(cachedDepts.data);
      if (cachedCourses?.data) setCourses(cachedCourses.data);
      if (cachedSections?.data) setSections(cachedSections.data);
      if (cachedDoctors?.data) {
        setDoctors(Array.isArray(cachedDoctors.data) ? cachedDoctors.data : cachedDoctors.data.users || []);
      }

      if (cachedDepts?.data && cachedCourses?.data && cachedSections?.data) {
        setLoading(false);
      }

      // 2. Fresh Network Fetch in Parallel
      const [depRes, crsRes, secRes, docRes] = await Promise.allSettled([
        apiFetch("/academic/departments"),
        apiFetch("/academic/courses"),
        apiFetch("/academic/sections"),
        apiFetch("/admin/users?role=DOCTOR"),
      ]);

      if (depRes.status === "fulfilled") {
        const d = depRes.value.data || [];
        setDepartments(d);
        if (d.length > 0 && !courseDept) setCourseDept(d[0]._id);
      }

      if (crsRes.status === "fulfilled") {
        const c = crsRes.value.data || [];
        setCourses(c);
        if (c.length > 0 && !secCourse) setSecCourse(c[0]._id);
      }

      if (secRes.status === "fulfilled") {
        setSections(secRes.value.data || []);
      }

      if (docRes.status === "fulfilled") {
        const docList = docRes.value.data?.users || docRes.value.data || [];
        setDoctors(docList);
        if (docList.length > 0 && !secDoctor) setSecDoctor(docList[0]._id);
      }
    } catch (err: any) {
      console.error("Failed to load academic data:", err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleTabChange = (tab: "departments" | "courses" | "sections") => {
    setActiveTab(tab);
    smartCache.setWorkspace("admin_academic_tab", tab);
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch("/academic/departments", {
        method: "POST",
        body: JSON.stringify({
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          college: deptCollege.trim(),
        }),
      });

      // Invalidate academic caches
      smartCache.invalidate("/academic/*");
      smartCache.invalidate("/dashboards/admin");

      setDeptModal(false);
      setDeptName("");
      setDeptCode("");
      setDialog({
        isOpen: true,
        title: "تم اعتماد القسم العلمي",
        message: "تم تسجيل القسم الأكاديمي بنجاح وتفعيله في المنظومة الجامعية.",
        type: "success",
      });
      loadAllAcademicData();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "فشل إنشاء القسم",
        message: err.message || "تعذر حفظ القسم العلمي.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !courseCode.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch("/academic/courses", {
        method: "POST",
        body: JSON.stringify({
          name: courseName.trim(),
          code: courseCode.trim().toUpperCase(),
          credits: Number(courseCredits) || 3,
          stage: Number(courseStage) || 1,
          department: courseDept || departments[0]?._id,
        }),
      });

      // Invalidate academic caches
      smartCache.invalidate("/academic/*");
      smartCache.invalidate("/dashboards/admin");

      setCourseModal(false);
      setCourseName("");
      setCourseCode("");
      setDialog({
        isOpen: true,
        title: "تم إضافة المقرر الدراسي",
        message: "تم إنشاء المقرر واعتماده رسميًا ضمن الخطة الدراسية للقسم.",
        type: "success",
      });
      loadAllAcademicData();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "فشل إضافة المقرر",
        message: err.message || "تعذر حفظ المقرر الدراسي.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/academic/sections", {
        method: "POST",
        body: JSON.stringify({
          course: secCourse || courses[0]?._id,
          doctor: secDoctor || doctors[0]?._id,
          sectionNumber: secNumber.trim().toUpperCase(),
          capacity: Number(secCapacity) || 50,
          semester: secSemester,
          academicYear: secYear.trim(),
          maxAbsenceHours: 6,
        }),
      });

      // Invalidate caches
      smartCache.invalidate("/academic/*");
      smartCache.invalidate("/doctor/*");
      smartCache.invalidate("/dashboards/admin");

      setSectionModal(false);
      setDialog({
        isOpen: true,
        title: "تم فتح الشعبة وتكليف التدريسي",
        message: "تم إنشاء الشعبة وإسنادها للأستاذ وتجهيزها لتسجيل الطلبة والحضور.",
        type: "success",
      });
      loadAllAcademicData();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "فشل إنشاء الشعبة",
        message: err.message || "تعذر فتح الشعبة الدراسية.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
              <span className="text-[#14352c] font-semibold">الهيكل الأكاديمي والشعب</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-[#14352c]" />
              الهيكل والمنظومة الأكاديمية
            </h1>
            <p className="text-sm text-slate-600">
              إدارة الأقسام العلمية، المقررات والمراحل الدراسية، وتكليف الأساتذة بالشعب
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "departments" && (
              <button
                onClick={() => setDeptModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> إضافة قسم علمي
              </button>
            )}
            {activeTab === "courses" && (
              <button
                onClick={() => setCourseModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> إضافة مقرر ومنهج
              </button>
            )}
            {activeTab === "sections" && (
              <button
                onClick={() => setSectionModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> فتح شعبة وتكليف أستاذ
              </button>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange("departments")}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "departments"
                ? "bg-[#14352c] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            الأقسام العلمية ({departments.length})
          </button>
          <button
            onClick={() => handleTabChange("courses")}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "courses"
                ? "bg-[#14352c] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            المقررات الدراسية ({courses.length})
          </button>
          <button
            onClick={() => handleTabChange("sections")}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "sections"
                ? "bg-[#14352c] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4" />
            الشعب وتكليف الأساتذة ({sections.length})
          </button>
        </div>

        {/* TAB 1: Departments */}
        {activeTab === "departments" && (
          <div className="space-y-4">
            {departments.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Building className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">لا توجد أقسام مسجلة</h4>
                <p className="text-xs text-slate-500">اضغط "إضافة قسم علمي" لإنشاء أول قسم.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {departments.map((d: any) => (
                  <div
                    key={d._id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 flex flex-col justify-between space-y-4 shadow-sm transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                          {d.code}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">{d.college}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 pt-1">{d.name}</h3>
                      {d.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">{d.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>الاعتماد الأكاديمي</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        نشط ومعتمد
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Courses */}
        {activeTab === "courses" && (
          <div className="space-y-4">
            {courses.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">لا توجد مقررات مضافة</h4>
                <p className="text-xs text-slate-500">اضغط "إضافة مقرر ومنهج" لإنشاء المقررات الأكاديمية.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((c: any) => (
                  <div
                    key={c._id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 flex flex-col justify-between space-y-4 shadow-sm transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono">
                          {c.code}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          المرحلة {c.stage || 1}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 pt-1">{c.name}</h3>
                      <p className="text-xs text-slate-600 flex items-center gap-2">
                        <span>القسم: {c.department?.name || "القسم العام"}</span>
                        <span>•</span>
                        <span className="font-semibold">{c.credits || 3} وحدات</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>حالة المنهج</span>
                      <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        معتمد رسميًا
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Sections & Doctor Assignment */}
        {activeTab === "sections" && (
          <div className="space-y-4">
            {sections.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">لا توجد شعب دراسية مفتوحة</h4>
                <p className="text-xs text-slate-500">اضغط "فتح شعبة وتكليف أستاذ" لتوزيع المقررات.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sections.map((s: any) => (
                  <div
                    key={s._id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 flex flex-col justify-between space-y-4 shadow-sm transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                          شعبة {s.sectionNumber}
                        </span>
                        <span className={`text-xs text-slate-500 ${mono.className}`}>
                          {s.students?.length || 0} / {s.capacity || 50} طالب
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {s.course?.name || "المقرر"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono">
                          كود: {s.course?.code || "CPE"}
                        </p>
                      </div>

                      {/* Doctor Assignment Card */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs">
                        <div className="size-8 rounded-lg bg-[#14352c] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {s.doctor?.name ? s.doctor.name[0] : "د"}
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] text-slate-500 block">الأستاذ المكلف:</span>
                          <span className="font-bold text-slate-900 truncate block">
                            {s.doctor?.name || "لم يُسند بعد"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>السنة: {s.academicYear || "2025-2026"}</span>
                      <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        نشطة للتسجيل
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Department Modal */}
      <Dialog
        isOpen={deptModal}
        onClose={() => setDeptModal(false)}
        title="إضافة قسم علمي جديد"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateDept} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم القسم الأكاديمي:</label>
            <input
              type="text"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="مثال: قسم هندسة الحاسوب..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">كود القسم المختصر:</label>
            <input
              type="text"
              required
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              placeholder="مثال: CPE..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono uppercase placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الكلية التابع لها:</label>
            <input
              type="text"
              required
              value={deptCollege}
              onChange={(e) => setDeptCollege(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeptModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition disabled:opacity-50"
            >
              حفظ واعتماد القسم
            </button>
          </div>
        </form>
      </Dialog>

      {/* Course Modal */}
      <Dialog
        isOpen={courseModal}
        onClose={() => setCourseModal(false)}
        title="إضافة مقرر دراسي جديد"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المقرر الدراسي:</label>
            <input
              type="text"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="مثال: هياكل البيانات والخوارزميات..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">كود المقرر:</label>
              <input
                type="text"
                required
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="CPE301"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono uppercase placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المرحلة:</label>
              <CustomSelect
                options={stageOptions}
                value={String(courseStage)}
                onChange={(val) => setCourseStage(parseInt(val) || 1)}
                theme="light"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الوحدات:</label>
              <input
                type="number"
                min="1"
                max="6"
                required
                value={courseCredits}
                onChange={(e) => setCourseCredits(parseInt(e.target.value) || 3)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#14352c] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">القسم التابع له:</label>
            <CustomSelect
              options={departmentOptions}
              value={courseDept}
              onChange={(val) => setCourseDept(val)}
              placeholder="اختر القسم..."
              theme="light"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCourseModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition disabled:opacity-50"
            >
              اعتماد المقرر
            </button>
          </div>
        </form>
      </Dialog>

      {/* Section Modal */}
      <Dialog
        isOpen={sectionModal}
        onClose={() => setSectionModal(false)}
        title="فتح شعبة دراسية وتكليف أستاذ"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSection} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المقرر الدراسي:</label>
            <CustomSelect
              options={courseSelectOptions}
              value={secCourse}
              onChange={(val) => setSecCourse(val)}
              placeholder="اختر المقرر الدراسي..."
              theme="light"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الأستاذ المكلف بالتدريس:</label>
            <CustomSelect
              options={doctorSelectOptions}
              value={secDoctor}
              onChange={(val) => setSecDoctor(val)}
              placeholder="اختر الأستاذ المكلف..."
              theme="light"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">رمز الشعبة:</label>
              <input
                type="text"
                required
                value={secNumber}
                onChange={(e) => setSecNumber(e.target.value)}
                placeholder="A1"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-[#14352c] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">السعة الاستيعابية:</label>
              <input
                type="number"
                min="10"
                max="200"
                required
                value={secCapacity}
                onChange={(e) => setSecCapacity(parseInt(e.target.value) || 50)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#14352c] transition"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSectionModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition disabled:opacity-50"
            >
              تأكيد فتح الشعبة
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
