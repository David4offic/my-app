'use client';

import { useState } from 'react';
import {
  Building2,
  Printer,
  Send,
  Info,
  Headphones,
  CheckCircle2,
  User,
  Package,
  FileText,
  Download,
} from 'lucide-react';

export default function Page() {
  const [form, setForm] = useState({
    invoiceNeeded: false,
    invoiceCompanyName: '',
    invoiceCode: '',
    invoiceVatCode: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    deviceModel: '',
    serialNumber: '',
    issueDescription: '',
    manufacturer: '',
    firstName: '',
    lastName: '',
    powerCable: false,
    usbCable: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const payload = {
        ...form,
        companyName: form.invoiceNeeded ? form.invoiceCompanyName : form.companyName,
      };

      const response = await fetch('/api/repair-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          type: 'error',
          message: data?.message || 'Nepavyko pateikti užklausos.',
          details: data?.errors || data?.jiraError || data?.error || null,
        });
        return;
      }

      setResult({
        type: 'success',
        message: 'Užklausa sėkmingai pateikta.',
        issueKey: data.issueKey,
        contract: data.contract || null,
      });

      setShowSuccessModal(true);

      setForm({
        invoiceNeeded: false,
        invoiceCompanyName: '',
        invoiceCode: '',
        invoiceVatCode: '',
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
        deviceModel: '',
        serialNumber: '',
        issueDescription: '',
        manufacturer: '',
        firstName: '',
        lastName: '',
        powerCable: false,
        usbCable: false,
      });
    } catch {
      setResult({
        type: 'error',
        message: 'Serveris nepasiekiamas arba įvyko nenumatyta klaida.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Printer size={20} />
            </div>
            <p className="text-xl font-black tracking-tight">4office</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Registruoti gedimą
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Užpildykite formą ir mūsų technikai susisieks su jumis per 2 darbo
            valandas.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="mb-2 flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" />
                <h2 className="text-lg font-bold">Kontaktinė informacija</h2>
              </div>
              <div className="border-b border-slate-100" />
            </div>

            <div className="col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                id="invoiceNeeded"
                name="invoiceNeeded"
                type="checkbox"
                checked={form.invoiceNeeded}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <label htmlFor="invoiceNeeded" className="text-sm font-medium text-slate-700">
                Ar reikia sąskaitos faktūros?
              </label>
            </div>

            {form.invoiceNeeded && (
              <>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="invoiceCompanyName" className="text-sm font-semibold text-slate-700">
                    Įmonės pavadinimas
                  </label>
                  <input
                    id="invoiceCompanyName"
                    name="invoiceCompanyName"
                    type="text"
                    value={form.invoiceCompanyName}
                    onChange={handleChange}
                    placeholder="UAB Testas"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="invoiceCode" className="text-sm font-semibold text-slate-700">
                    Įmonės kodas
                  </label>
                  <input
                    id="invoiceCode"
                    name="invoiceCode"
                    type="text"
                    value={form.invoiceCode}
                    onChange={handleChange}
                    placeholder="123456789"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="invoiceVatCode" className="text-sm font-semibold text-slate-700">
                    PVM mokėtojo kodas
                  </label>
                  <input
                    id="invoiceVatCode"
                    name="invoiceVatCode"
                    type="text"
                    value={form.invoiceVatCode}
                    onChange={handleChange}
                    placeholder="LT123456789"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="firstName"
                className="text-sm font-semibold text-slate-700"
              >
                Vardas
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Vardas"
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="lastName"
                className="text-sm font-semibold text-slate-700"
              >
                Pavardė
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Pavardė"
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="phone"
                className="text-sm font-semibold text-slate-700"
              >
                Kontaktinis telefonas <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="+370..."
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
              >
                El. pašto adresas <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="pvz@gmail.com  "
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="mb-2 flex items-center gap-2">
                <Package size={20} className="text-blue-600" />
                <h2 className="text-lg font-bold">Įrenginio duomenys</h2>
              </div>
              <div className="border-b border-slate-100" />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="manufacturer"
                className="text-sm font-semibold text-slate-700"
              >
                Gamintojas
              </label>
              <input
                id="manufacturer"
                name="manufacturer"
                type="text"
                value={form.manufacturer}
                onChange={handleChange}
                placeholder="HP"
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="deviceModel"
                className="text-sm font-semibold text-slate-700"
              >
                Įrenginio modelis <span className="text-red-500">*</span>
              </label>
              <input
                id="deviceModel"
                name="deviceModel"
                type="text"
                required
                value={form.deviceModel}
                onChange={handleChange}
                placeholder="HP LaserJet Pro"
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="serialNumber"
                className="text-sm font-semibold text-slate-700"
              >
                Serijinis numeris (S/N)
              </label>
              <input
                id="serialNumber"
                name="serialNumber"
                type="text"
                value={form.serialNumber}
                onChange={handleChange}
                placeholder="SN123456789"
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label
                htmlFor="issueDescription"
                className="text-sm font-semibold text-slate-700"
              >
                Gedimo aprašymas <span className="text-red-500">*</span>
              </label>
              <textarea
                id="issueDescription"
                name="issueDescription"
                required
                rows={5}
                value={form.issueDescription}
                onChange={handleChange}
                placeholder="Spausdintuvas stringa, popierius užstringa ties išėjimu..."
                className="resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold">Priedai</h2>
            </div>
            <div className="border-b border-slate-100" />

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  name="powerCable"
                  checked={form.powerCable}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Maitinimo laidas
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  name="usbCable"
                  checked={form.usbCable}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  USB laidas
                </span>
              </label>
            </div>
          </div>

          {result?.type === 'error' && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">{result.message}</p>
              {result.details && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                  {typeof result.details === 'string'
                    ? result.details
                    : JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-2 text-sm italic text-slate-500">
              <Info size={16} />
              Laukuose pažymėtuose * informacija privaloma
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            >
              {submitting ? 'Siunčiama...' : 'Pateikti užklausą'}
              <Send size={18} />
            </button>
          </div>
        </form>

        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <div className="text-blue-600">
            <Headphones size={36} />
          </div>
          <div>
            <p className="font-bold text-slate-900">Reikia skubios pagalbos?</p>
            <p className="text-sm text-slate-600">
              Skambinkite tel.{' '}
              <span className="font-bold text-blue-600">+370 600 00000</span>{' '}
              (I-V, 8:00 - 17:00)
            </p>
          </div>
        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={40} />
            </div>

            <h3 className="mt-4 text-center text-2xl font-bold text-slate-900">
              Užklausa pateikta sėkmingai
            </h3>

            <p className="mt-3 text-center text-slate-600">
              Jūsų remonto registracija buvo sėkmingai išsiųsta.
            </p>

            {result?.issueKey && (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-sm text-slate-500">Užklausos numeris</p>
                <p className="text-lg font-bold text-blue-600">
                  {result.issueKey}
                </p>
              </div>
            )}

            {result?.contract?.downloadUrl && (
              <a
                href={result.contract.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Download size={18} />
                Atsisiųsti aktą (.docx)
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Gerai
            </button>
          </div>
        </div>
      )}

      <footer className="py-10 text-center text-sm text-slate-400">
        <p>© 2024 4office. Visos teisės saugomos.</p>
      </footer>
    </div>
  );
}
