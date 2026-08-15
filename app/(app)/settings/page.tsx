"use client";

import { useState } from "react";
import { setSettings, getSettings } from "@/lib/settings";
import { PaperSize, Orientation } from "@/lib/settings-types";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setLocal] = useState(getSettings());

  const update = (patch: Partial<ReturnType<typeof getSettings>>) => {
    const next = { ...settings, ...patch };
    setLocal(next);
    setSettings(patch);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-bold text-ink">Pengaturan</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Preferensi kecil tersimpan di perangkat ini. Project besar tetap di IndexedDB.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Preferensi Umum</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Bahasa">
            <Select value={settings.language} onChange={(e) => update({ language: e.target.value as "id" })}>
              <option value="id">Bahasa Indonesia</option>
            </Select>
          </Field>
          <Field label="Mata uang">
            <Select value={settings.currency} onChange={(e) => update({ currency: e.target.value as "IDR" })}>
              <option value="IDR">IDR - Rupiah</option>
            </Select>
          </Field>
          <Field label="Ukuran kertas default">
            <Select value={settings.defaultPaperSize} onChange={(e) => update({ defaultPaperSize: e.target.value as PaperSize })}>
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="letter">Letter</option>
            </Select>
          </Field>
          <Field label="Orientasi default">
            <Select value={settings.defaultOrientation} onChange={(e) => update({ defaultOrientation: e.target.value as Orientation })}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => { toast("Pengaturan disimpan."); }}>
            Simpan
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Tentang SiapinAja</h2>
        <div className="mt-3 space-y-1.5 text-sm text-ink-secondary">
          <p>
            <strong className="text-ink">Versi V1</strong> - semua tools berjalan di browser.
          </p>
          <p>Data kerjaamu tidak pernah dikirim ke server. Project tersimpan di IndexedDB.</p>
          <p>Export JSON untuk memindahkan project ke perangkat lain.</p>
        </div>
      </section>
    </div>
  );
}