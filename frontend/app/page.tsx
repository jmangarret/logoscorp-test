"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/app/api/user/user.api";
import { transformUserData, validateUserCompany } from "@/app/commons/utils/user.transform";
import EditUserModal from "@/app/users/EditUserModal";
import type { User } from "@/app/users/interface";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendError, setSendError] = useState(false);
  const [sending, setSending] = useState(false);

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

  const selectableUsers = users.filter((user) => validateUserCompany(user.company));
  const allSelected = selectableUsers.length > 0 && selectedUsers.length === selectableUsers.length;
  function toggleAll() {
    setSendMessage("");
    setSendError(false);
    setSelectedUsers(allSelected ? [] : selectableUsers.map((user) => user.id));
  }

  function toggleUser(id: number) {
    setSendMessage("");
    setSendError(false);
    setSelectedUsers((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }
  /**
   * Edit the user with the given id.
   * Open a modal with the user information and the ability to edit the user information.
   * @param id - The id of the user to edit.
   */
  function editUser(id: number) {
    const user = users.find((user) => user.id === id);
    if (user) setEditingUser(user);
  }

  async function saveEditedUser(updatedUser: User) {
    const response = await fetch("/api/zoho/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users: [updatedUser] }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudieron guardar los cambios en Zoho CRM.");

    setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user));
    setEditingUser(null);
    setSendMessage(`${updatedUser.name} ${result.action === "created" ? "se creó" : "se actualizó"} en Zoho CRM.`);
    setSendError(false);
  }

  async function sendSelectedUsers() {
    const selected = users.filter((user) => selectedUsers.includes(user.id));
    setSending(true);
    setSendMessage("");
    setSendError(false);
    try {
      const response = await fetch("/api/zoho/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: selected }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron enviar los contactos a Zoho CRM.");

      const successfulIds = (result.outcomes as { id: number; success: boolean }[])
        .filter((outcome) => outcome.success)
        .map((outcome) => outcome.id);
      setSelectedUsers((current) => current.filter((id) => !successfulIds.includes(id)));
      setSendError(result.failed > 0);
      setSendMessage(`${result.sent} enviados a Zoho CRM${result.failed ? ` · ${result.failed} con error` : " correctamente"}.`);
    } catch (caught) {
      setSendError(true);
      setSendMessage(caught instanceof Error ? caught.message : "No se pudieron enviar los contactos a Zoho CRM.");
    } finally {
      setSending(false);
    }
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
            <div className="toolbar-actions">
              <span className="selection-count" aria-live="polite">{selectedUsers.length} seleccionados</span>
              {selectedUsers.length > 0 && (
                <button className="send-button" type="button" onClick={sendSelectedUsers} disabled={sending}>
                  {sending ? "Enviando…" : "Enviar a Zoho CRM"}
                </button>
              )}
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
                    <th>Edit</th>
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
                      <td><span className="skeleton skeleton-edit" /></td>
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
                        <td><span className="">{user.company.name}</span></td>
                        <td><button className="edit-button" type="button" onClick={() => editUser(user.id)}>Edit</button></td>
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
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={saveEditedUser} />}
    </main>
  );
}
