import Link from 'next/link';
import {
  Bell,
  UserCircle2,
  Wrench,
  Printer,
  Barcode,
  MessageSquare,
  Headphones,
  Phone,
  History,
  Truck,
  Check,
} from 'lucide-react';

function mapJiraStatusToUi(status) {
  const normalized = (status || '').trim().toLowerCase();

  if (normalized === 'nauja užklausa') {
    return {
      currentStep: 0,
      currentLabel: 'Registruota',
      progressWidth: 'w-1/4',
    };
  }

  if (normalized === 'diagnostika') {
    return {
      currentStep: 1,
      currentLabel: 'Diagnostika',
      progressWidth: 'w-2/4',
    };
  }

  if (
    normalized === 'pateikti pasiulyma' ||
    normalized === 'pateikti pasiūlymą' ||
    normalized === 'paruosti samata' ||
    normalized === 'paruošti sąmatą' ||
    normalized === 'patvirtinta'
  ) {
    return {
      currentStep: 2,
      currentLabel: 'Remontas',
      progressWidth: 'w-3/4',
    };
  }

  if (normalized === 'pataisytas') {
    return {
      currentStep: 3,
      currentLabel: 'Paruošta',
      progressWidth: 'w-full',
    };
  }

  return {
    currentStep: 0,
    currentLabel: status || 'Registruota',
    progressWidth: 'w-1/4',
  };
}

function formatDate(value) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleDateString('lt-LT');
  } catch {
    return '—';
  }
}

function formatDateTime(value) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString('lt-LT');
  } catch {
    return '—';
  }
}

function Step({ title, subtitle, active, done, muted }) {
  return (
    <div className={`flex flex-col items-center text-center ${muted ? 'opacity-40' : ''}`}>
      <div
        className={[
          'w-6 h-6 rounded-full ring-4 ring-white mb-3 z-10 flex items-center justify-center relative',
          done ? 'bg-[#007fff]' : '',
          active ? 'bg-[#007fff]' : '',
          !done && !active ? 'bg-slate-300' : '',
        ].join(' ')}
      >
        {done ? (
          <Check className="w-3.5 h-3.5 text-white" />
        ) : active ? (
          <div className="absolute inset-0 rounded-full bg-[#007fff]/20 animate-ping" />
        ) : null}
      </div>

      <span
        className={[
          'text-sm font-bold',
          active ? 'text-[#007fff]' : 'text-slate-900',
          muted ? 'text-slate-500' : '',
        ].join(' ')}
      >
        {title}
      </span>

      <span className={`text-[11px] mt-1 ${active ? 'text-[#007fff]/70' : 'text-slate-500'}`}>
        {subtitle || ''}
      </span>
    </div>
  );
}

async function getStatus(issueKey) {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/status/${issueKey}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function StatusPage({ params }) {
  const { issueKey } = await params;
  const data = await getStatus(issueKey);

  if (!data || !data.success) {
    return (
      <main className="min-h-screen bg-[#f5f7f8] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Užsakymas nerastas
          </h1>
          <p className="mt-3 text-slate-600">
            Nepavyko gauti informacijos pagal numerį <strong>{issueKey}</strong>.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#007fff] px-5 py-3 font-bold text-white"
          >
            Grįžti į pradžią
          </Link>
        </div>
      </main>
    );
  }

  const jiraStatus = data.status || 'Nauja užklausa';
  const ui = mapJiraStatusToUi(jiraStatus);

  const createdAt = data.created || null;
  const updatedAt = data.updated || null;
  const model = data.deviceModel || '—';
  const serial = data.serialNumber || '—';
  const technicianNote = data.technicianNote || 'Techniko pastabų kol kas nėra.';
  const deliveryMethod = data.deliveryMethod || 'Atsiėmimas centre';

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7f8] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="text-xl font-black uppercase tracking-tight text-slate-900">
              4Office
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-slate-500 transition-colors hover:text-blue-600">
              <Bell className="h-5 w-5" />
            </button>
            <button className="text-slate-500 transition-colors hover:text-blue-600">
              <UserCircle2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-grow px-6 py-12">
        <div className="mb-10">
          <h1 className="text-[2.25rem] font-black leading-none tracking-tighter text-slate-900">
            Užsakymo būsena #{issueKey}
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Stebėkite savo įrenginio remonto eigą realiu laiku.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-slate-200/70 bg-white p-8 shadow-sm">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#007fff]/5 text-[#007fff]">
                  <Wrench className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900">Remonto eiga</h2>
              </div>

              <div className="relative pb-12 pt-4">
                <div className="absolute left-0 top-[26px] h-1 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full rounded-full bg-[#007fff] transition-all duration-500 ${ui.progressWidth}`} />
                </div>

                <div className="relative flex justify-between gap-4">
                  <Step
                    title="Registruota"
                    subtitle={ui.currentStep >= 0 ? formatDate(createdAt) : ''}
                    done={ui.currentStep > 0}
                    active={ui.currentStep === 0}
                  />
                  <Step
                    title="Diagnostika"
                    subtitle={jiraStatus.toLowerCase() === 'diagnostika' ? 'Vykdoma' : ''}
                    done={ui.currentStep > 1}
                    active={ui.currentStep === 1}
                  />
                  <Step
                    title="Remontas"
                    subtitle={ui.currentStep === 2 ? 'Vykdoma' : ''}
                    done={ui.currentStep > 2}
                    active={ui.currentStep === 2}
                  />
                  <Step
                    title="Paruošta"
                    subtitle={ui.currentStep === 3 ? formatDate(updatedAt) : ''}
                    done={false}
                    active={ui.currentStep === 3}
                    muted={ui.currentStep < 3}
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-8 border-t border-slate-200/60 pt-8 md:grid-cols-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Įrenginys
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <Printer className="h-5 w-5 text-[#007fff]" />
                    <p className="text-lg font-bold leading-tight text-slate-900">{model}</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Serijinis numeris
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <Barcode className="h-5 w-5 text-[#007fff]" />
                    <p className="font-mono text-lg font-bold leading-tight text-slate-900">
                      {serial}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#007fff]/10 bg-[#007fff]/5 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-[#007fff]/10 p-2 text-[#007fff]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#007fff]">
                    Techniko pastaba
                  </span>
                  <p className="mt-2 italic leading-relaxed text-slate-900">
                    "{technicianNote}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-center rounded-xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-[#007fff]">
                <Headphones className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Reikia pagalbos?</h3>
              <p className="mb-6 mt-2 text-sm text-slate-600">
                Turite klausimų dėl užsakymo eigos ar detalių?
              </p>

              <a
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#007fff] px-6 py-4 font-bold text-white shadow-lg shadow-blue-300/40 transition-all hover:opacity-90 active:scale-95"
                href="tel:+37052305365"
              >
                <Phone className="h-5 w-5" />
                <span>+370 5 230 5365</span>
              </a>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-6">
              <h4 className="mb-4 text-sm font-bold text-slate-900">Kita informacija</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <History className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div className="text-[13px]">
                    <p className="font-bold leading-none text-slate-900">Užsakymas sukurtas</p>
                    <p className="mt-1 leading-none text-slate-600">{formatDateTime(createdAt)}</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div className="text-[13px]">
                    <p className="font-bold leading-none text-slate-900">Pristatymo būdas</p>
                    <p className="mt-1 leading-none text-slate-600">{deliveryMethod}</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Wrench className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div className="text-[13px]">
                    <p className="font-bold leading-none text-slate-900">Jira statusas</p>
                    <p className="mt-1 leading-none text-slate-600">{jiraStatus}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 md:grid-cols-2">
          <div>
            <span className="text-lg font-black uppercase tracking-tight text-slate-900">
              4office
            </span>
            <p className="mt-4 text-sm font-medium text-slate-500">
              4Office, UAB © 2026 Visos teisės saugomos
            </p>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex gap-6">
              <a className="text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-900" href="#">
                Pagalba
              </a>
              <a className="text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-900" href="#">
                Kontaktai
              </a>
              <a className="text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-900" href="#">
                Privatumo politika
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
