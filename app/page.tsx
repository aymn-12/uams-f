"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";

const FEATURES = [
  { title: "الدرجات", text: "نتائج الامتحانات والأعمال الفصلية فور اعتمادها." },
  { title: "الجدول الدراسي", text: "المحاضرات والقاعات ومواعيد الامتحانات." },
  { title: "الإعلانات", text: "تبليغات القسم والتدريسيين في مكان واحد." },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Emblem({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect x="1" y="1" width="46" height="46" rx="8" stroke="#b8923f" strokeWidth="2" />
      <path
        d="M24 11 7 19l17 8 17-8-17-8Z"
        fill="#b8923f"
      />
      <path
        d="M14 25v6c0 2.5 4.5 5 10 5s10-2.5 10-5v-6l-10 4.7L14 25Z"
        stroke="#b8923f"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const inputBase =
  "w-full h-11 px-3 bg-white border rounded-md text-[15px] text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 " +
  "[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#fff_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a]";

export default function LoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailError = !email.trim()
    ? "أدخل البريد الإلكتروني."
    : !EMAIL_RE.test(email.trim())
    ? "صيغة البريد غير صحيحة."
    : "";
  const passwordError = !password ? "أدخل كلمة المرور." : "";

  const showEmailError = touched.email && emailError;
  const showPasswordError = touched.password && passwordError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setTouched({ email: true, password: true });

    if (emailError) return emailRef.current?.focus();
    if (passwordError) return passwordRef.current?.focus();

    setLoading(true);
    try {
      const user = await loginUser(email.trim().toLowerCase(), password);
      if (user.role === "STUDENT") router.push("/dashboard/student");
      else if (user.role === "DOCTOR") router.push("/dashboard/doctor");
      else router.push("/dashboard/admin");
    } catch (err: any) {
      setError(err?.message || "تعذّر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.");
      setPassword("");
      passwordRef.current?.focus();
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) =>
    setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      <main className="flex-1 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] bg-white text-slate-900">
      {/* Form side */}
      <section className="flex items-center justify-center px-5 sm:px-8 py-10">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <Emblem className="w-10 h-10 bg-[#14352c] rounded-lg" />
            <span className="font-semibold">الجامعة المستنصرية</span>
          </div>

          <h1 className="text-[26px] font-bold leading-tight">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-slate-600">
            سجّل بحسابك الجامعي للوصول إلى لوحتك.
          </p>

          <div aria-live="assertive">
            {error && (
              <div
                role="alert"
                className="mt-6 flex gap-2.5 items-start border border-red-200 bg-red-50 text-red-800 text-sm rounded-md px-3.5 py-3"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-11.5a.75.75 0 0 1 1.5 0v4a.75.75 0 0 1-1.5 0v-4Zm.75 7.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-800 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                dir="ltr"
                value={email}
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="name@uomustansiriyah.edu.iq"
                aria-invalid={!!showEmailError}
                aria-describedby={showEmailError ? "email-error" : undefined}
                suppressHydrationWarning
                className={`${inputBase} text-left ${
                  showEmailError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-300 hover:border-slate-400 focus:border-[#14352c] focus:ring-[#14352c]/15"
                }`}
              />
              {showEmailError && (
                <p id="email-error" className="mt-1.5 text-xs text-red-700">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-800">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  className="text-xs font-medium text-[#14352c] hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14352c]"
                >
                  {showPassword ? "إخفاء" : "إظهار"}
                </button>
              </div>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                dir="ltr"
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                onKeyUp={onKey}
                onKeyDown={onKey}
                aria-invalid={!!showPasswordError}
                aria-describedby={
                  [showPasswordError ? "password-error" : "", capsOn ? "caps-hint" : ""]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                suppressHydrationWarning
                className={`${inputBase} text-left ${
                  showPasswordError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-300 hover:border-slate-400 focus:border-[#14352c] focus:ring-[#14352c]/15"
                }`}
              />
              {showPasswordError && (
                <p id="password-error" className="mt-1.5 text-xs text-red-700">
                  {passwordError}
                </p>
              )}
              {capsOn && (
                <p id="caps-hint" className="mt-1.5 text-xs text-amber-700">
                  زر الحروف الكبيرة (Caps Lock) مفعّل.
                </p>
              )}
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[#14352c] cursor-pointer"
              />
              تذكّرني على هذا الجهاز
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#14352c] hover:bg-[#1b4a3d] active:bg-[#0f2a22] text-white font-semibold rounded-md text-[15px] transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14352c]"
            >
              {loading && <Spinner />}
              {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
            </button>
          </form>

          <p className="mt-8 text-xs leading-6 text-slate-500">
            نسيت كلمة المرور؟ راجع إدارة القسم لإعادة تعيينها.
          </p>
        </div>
      </section>

      {/* Info side */}
      <aside
        className="hidden lg:flex flex-col justify-between bg-[#14352c] text-white px-14 py-12 relative overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 39px, rgba(255,255,255,0.045) 39px 40px)",
        }}
      >
        <div className="absolute inset-y-0 start-14 w-px bg-[#b8923f]/40" aria-hidden="true" />

        <div className="flex items-center gap-3 ps-6">
          <Emblem className="w-11 h-11" />
          <div>
            <div className="font-semibold leading-tight">الجامعة المستنصرية</div>
            <div className="text-xs text-emerald-100/70 mt-0.5">البوابة الأكاديمية</div>
          </div>
        </div>

        <div className="ps-6 max-w-[460px]">
          <h2 className="text-[34px] font-bold leading-[1.35]">
            متابعتك الدراسية، بوضوح.
          </h2>
          <ul className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {FEATURES.map((f) => (
              <li key={f.title} className="py-4">
                <div className="font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-emerald-100/70 leading-6">{f.text}</div>
              </li>
            ))}
          </ul>
        </div>

        <p className="ps-6 text-xs text-emerald-100/60">
          © 2027 الجامعة المستنصرية
        </p>
      </aside>
    </main>
  </div>
);
}