"use client";

import { useEffect, useMemo, useState } from "react";
import { getUsers } from "@/app/api/user/user.api";
import { transformUserData, validateUserCompany } from "@/app/commons/utils/user.transform";
import type { User } from "@/app/users/interface";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendError, setSendError] = useState(false);

  useEffect(() => {
    let active = true;

    getUsers()
      .then((data: User[]) => {
        if (active) setUsers(transformUserData(data));
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar los usuarios. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const selectedLabel = useMemo(
    () => `${selectedUsers.length} seleccionados`,
    [selectedUsers.length],
  );

  function toggleAll() {
    setSendMessage("");
    setSelectedUsers(allSelected ? [] : users.map((user) => user.id));
  }

  function toggleUser(id: number) {
    setSendMessage("");
    setSelectedUsers((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  return (
    <main className="users-page">
      <div className="users-shell">
        <header className="page-header">
          <div className="eyebrow"><span className="eyebrow-dot" /> DIRECTORIO</div>
          <div className="heading-row">
            <div>
              <h1>Users</h1>
              <p className="subtitle">Gestiona la información de tus usuarios.</p>
            </div>
            <div className="count-pill"><span className="count-dot" /> {users.length} usuarios</div>
          </div>
        </header>

        <section className="table-card" aria-label="Directorio de usuarios">
          <div className="table-toolbar">
            <div className="toolbar-title">
              <span className="list-icon" aria-hidden="true"><i /><i /><i /></span>
              <span>Todos los usuarios</span>
            </div>
          </div>

          {sendMessage && <div className={`send-feedback ${sendError ? "send-feedback-error" : ""}`} role="status">{sendMessage}</div>}

          {error ? (
            <div className="table-message error-message" role="alert">
              <span className="message-symbol">!</span>
              <p>{error}</p>
              <button className="retry-button" onClick={() => window.location.reload()}>Reintentar</button>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="checkbox-cell">
                      <input
                        aria-label="Seleccionar todos los usuarios"
                        type="checkbox"
                        checked={allSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = selectedUsers.length > 0 && !allSelected;
                        }}
                        onChange={toggleAll}
                        disabled={loading || users.length === 0}
                      />
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company Name</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 5 }, (_, index) => (
                    <tr className="skeleton-row" key={index} aria-hidden="true">
                      <td className="checkbox-cell"><span className="skeleton skeleton-check" /></td>
                      <td><span className="skeleton skeleton-name" /></td>
                      <td><span className="skeleton skeleton-email" /></td>
                      <td><span className="skeleton skeleton-phone" /></td>
                      <td><span className="skeleton skeleton-company" /></td>
                    </tr>
                  )) : users.map((user) => {
                    const selected = selectedUsers.includes(user.id);
                    const companyValid = validateUserCompany(user.company);
                    return (
                      <tr key={user.id} className={ selected ? "selected-row" : !companyValid ? "invalid-company-row" : ""} data-invalid-company={!companyValid ? "true" : "false"}>
                        <td className="checkbox-cell">
                          <input
                            aria-label={`Seleccionar a ${user.name}`}
                            type="checkbox"
                            checked={selected}
                            disabled={!companyValid}
                            onChange={() => toggleUser(user.id)}
                          />
                        </td>
                        <td><span className="user-name">{user.name}</span></td>
                        <td><a className="email-link" href={`mailto:${user.email}`}>{user.email}</a></td>
                        <td><span className="phone-value">{user.phone}</span></td>
                        <td><span className="company-name">{user.company.name}</span></td>
                      </tr>
                    );
                  })}
                  {!loading && users.length === 0 && !error && (
                    <tr><td className="empty-state" colSpan={5}>No hay usuarios disponibles.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <footer className="table-footer">
            <span>Mostrando <strong>{users.length}</strong> usuarios</span>
            <span className="footer-status"><span className="status-dot" /> Datos sincronizados</span>
          </footer>
        </section>
        <p className="page-caption">Los datos se actualizan directamente desde la API.</p>
      </div>
    </main>
  );
}
