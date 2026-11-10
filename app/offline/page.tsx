export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl">📶</div>
      <h1 className="text-xl font-bold">لا يوجد اتصال · Hors ligne</h1>
      <p className="text-slate-600">تحقق من اتصالك بالإنترنت ثم أعد المحاولة.</p>
      <p className="text-slate-600">Vérifiez votre connexion Internet puis réessayez.</p>
    </main>
  );
}
