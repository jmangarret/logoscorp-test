"use client";

import { useState, type FormEvent } from "react";
import type { User } from "./interface";
import styles from "./EditUserModal.module.css";

type EditUserModalProps = {
  user: User;
  onClose: () => void;
  onSave: (user: User) => Promise<void>;
};

export default function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    companyName: user.company.name,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      //simulate error
      if (form.name.startsWith("C")){
        throw "Error nombre C";
      }
      await onSave({
        ...user,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: { ...user.company, name: form.companyName.trim() },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron guardar los cambios en Zoho CRM.");
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>USUARIO · #{user.id}</p>
            <h2 className={styles.title} id="edit-user-title">Editar usuario</h2>
            <p className={styles.description}>Los cambios se guardarán directamente en Zoho CRM.</p>
          </div>
          <button className={styles.close} type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}>×</button>
        </header>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Name</span>
            <input className={styles.input} autoFocus required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <input className={styles.input} required type="email" maxLength={120} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Phone</span>
            <input className={styles.input} type="tel" maxLength={40} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Company Name</span>
            <input className={styles.input} required maxLength={120} value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <footer className={styles.actions}>
            <button className={styles.cancel} type="button" disabled={saving} onClick={onClose}>Cancelar</button>
            <button className={styles.save} type="submit" disabled={saving}>
              {saving ? "Guardando en Zoho…" : "Guardar en Zoho CRM"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
