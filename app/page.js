'use client';

import { useState } from 'react';
import { Search, ShieldCheck, Wrench, Phone } from 'lucide-react';

export default function Page() {
  const [issueKey, setIssueKey] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    const normalized = issueKey.trim().toUpperCase();

    if (!/^IR-\d+$/.test(normalized)) {
      setError('Įveskite teisingą užsakymo numerį, pvz. IR-1234.');
      return;
    }

    setError('');
    window.location.href = `/status/${normalized}`;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <img src="/logo.svg" alt="4office" className="h-10 w-auto md:h-12" />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-16">
        <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#007fff]/10 px-4 py-2 text-sm font-semibold text-[#007fff]">
              <ShieldCheck className="h-4 w-4" />
              4office remonto sekimas
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
              Patikrinkite savo remonto užsakymo būseną
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Įveskite užsakymo numerį ir iškart matysite, kuriame etape šiuo metu yra jūsų
              įrenginio remontas.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
            >
              <label htmlFor="issueKey" className="mb-3 block text-sm font-bold text-slate-700">
                Užsakymo numeris
              </label>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  id="issueKey"
                  name="issueKey"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="off"
                  value={issueKey}
                  onChange={(event) => setIssueKey(event.target.value)}
                  placeholder="IR-0000"
                  className="h-14 flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-lg font-semibold outline-none transition focus:border-[#007fff] focus:ring-4 focus:ring-blue-100"
                />

                <button
                  type="submit"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#007fff] px-6 font-bold text-white transition hover:opacity-95 active:scale-[0.99]"
                >
                  <Search className="h-5 w-5" />
                  Tikrinti būseną
                </button>
              </div>

              {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#007fff]/10 p-3 text-[#007fff]">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Kaip tai veikia
                </p>
                <p className="text-xl font-black text-slate-900">3 paprasti žingsniai</p>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-[#007fff]">1. Suraskite numerį</p>
                <p className="mt-1 text-slate-700">
                  Naudokite užsakymo numerį, kurį gavote registracijos metu arba el. paštu.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-[#007fff]">2. Įveskite IR kodą</p>
                <p className="mt-1 text-slate-700">
                  Pavyzdys: <span className="font-semibold">IR-0341</span>.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-[#007fff]">3. Matykite eigą</p>
                <p className="mt-1 text-slate-700">
                  Puslapyje iškart matysite diagnostikos, remonto ir paruošimo statusą.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 text-slate-900">
                <Phone className="h-5 w-5 text-[#007fff]" />
                <span className="font-bold">Reikia pagalbos?</span>
              </div>
              <a
                href="tel:+37052305365"
                className="mt-3 inline-flex text-lg font-black text-[#007fff] hover:underline"
              >
                +370 5 230 5365
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
