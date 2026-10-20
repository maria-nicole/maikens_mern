import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserPlus, RefreshCw, ChevronDown } from "lucide-react";
import { api, errMsg, formatDate, ROLE_LABEL, ROLE_TONE } from "./adminLib";
import {
    SectionHeader, PrimaryButton, GhostButton, Segmented, EmptyState, Spinner, ErrorNote, ConfirmDialog, Modal, ModalHeader, Field, inputCls,
} from "./ui";

const ROLE_FILTERS = [
    { value: "all", label: "All" },
    { value: "admin", label: "Admin" },
    { value: "staff", label: "Staff" },
    { value: "customer", label: "Customers" },
];

export default function UsersView({ me, notify }) {
    const [users, setUsers] = useState(null);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [role, setRole] = useState("all");
    const [busyId, setBusyId] = useState(null);
    const [confirm, setConfirm] = useState(null); // { user, kind: "status" | "role", value }
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get("/admin/users");
            setUsers(data);
            setError("");
        } catch (err) {
            setError(errMsg(err));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (users || []).filter(
            (u) =>
                (role === "all" || (u.role || "customer") === role) &&
                (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        );
    }, [users, query, role]);

    const replace = (updated) => setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));

    const applyChange = async () => {
        const { user, kind, value } = confirm;
        setBusyId(user._id);
        try {
            const { data } =
                kind === "status"
                    ? await api.patch(`/admin/users/${user._id}/status`, { isActive: value })
                    : await api.patch(`/admin/users/${user._id}/role`, { role: value });
            replace(data);
            notify("success", kind === "status" ? (value ? "Account reactivated." : "Account deactivated.") : `Role changed to ${ROLE_LABEL[value]}.`);
            setConfirm(null);
        } catch (err) {
            notify("error", errMsg(err));
            setConfirm(null);
        } finally {
            setBusyId(null);
        }
    };

    // Confirm an account by hand, for a customer whose verification email never arrived.
    const verifyUser = async (user) => {
        setBusyId(user._id);
        try {
            const { data } = await api.patch(`/admin/users/${user._id}/verify`);
            replace(data);
            notify("success", `${user.username} can now log in.`);
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBusyId(null);
        }
    };

    const confirmText = () => {
        if (!confirm) return {};
        const { user, kind, value } = confirm;
        if (kind === "role") {
            return {
                title: "Change this role?",
                message: `${user.username} will become ${ROLE_LABEL[value]}. ${value === "admin" ? "Admins can see and change everything in this console." : value === "staff" ? "Staff can use the counter console but not this one." : "They will lose access to the staff and admin consoles."}`,
                label: "Change role",
            };
        }
        return value
            ? { title: "Reactivate this account?", message: `${user.username} will be able to log in again.`, label: "Reactivate" }
            : { title: "Deactivate this account?", message: `${user.username} will be signed out of every request and can't log in until you reactivate the account.`, label: "Deactivate" };
    };

    return (
        <div>
            <SectionHeader
                eyebrow="User account management"
                title="Staff & customer accounts"
                action={
                    <div className="flex gap-2">
                        <GhostButton icon={RefreshCw} onClick={load}>Refresh</GhostButton>
                        <PrimaryButton icon={UserPlus} onClick={() => setAdding(true)}>Add user</PrimaryButton>
                    </div>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Segmented label="Role" value={role} options={ROLE_FILTERS} onChange={setRole} />
                <div className="relative min-w-[200px] max-w-xs flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" aria-label="Search users" className={`${inputCls} pl-8`} />
                </div>
            </div>

            <ErrorNote onRetry={load}>{error}</ErrorNote>

            <div className="overflow-x-auto rounded-2xl border border-[#E3DACB] bg-white">
                {users === null && !error ? (
                    <Spinner label="Loading accounts…" />
                ) : (
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#EFE9E3] text-xs uppercase tracking-wide text-[#9C8C74]">
                                <th className="px-5 py-3 font-medium">Name</th>
                                <th className="px-5 py-3 font-medium">Role</th>
                                <th className="px-5 py-3 font-medium">Email</th>
                                <th className="px-5 py-3 font-medium">Joined</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => {
                                const r = u.role || "customer";
                                const tone = ROLE_TONE[r] || ROLE_TONE.customer;
                                const active = u.isActive !== false;
                                const isMe = me && String(u._id) === String(me._id);
                                return (
                                    <tr key={u._id} className={`border-b border-[#F3EEE4] last:border-0 hover:bg-[#FBF8F3] ${busyId === u._id ? "opacity-60" : ""}`}>
                                        <td className="px-5 py-3 font-medium text-[#241F1A]">
                                            {u.username}
                                            {isMe && <span className="ml-2 text-xs font-normal text-[#9C8C74]">(you)</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            {isMe ? (
                                                <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: tone.bg, color: tone.text }}>{ROLE_LABEL[r]}</span>
                                            ) : (
                                                <div className="relative inline-block">
                                                    <select
                                                        value={r}
                                                        onChange={(e) => setConfirm({ user: u, kind: "role", value: e.target.value })}
                                                        aria-label={`Role of ${u.username}`}
                                                        className="cursor-pointer appearance-none rounded-full border-0 py-1 pl-3 pr-7 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#B4A88F]"
                                                        style={{ background: tone.bg, color: tone.text }}
                                                    >
                                                        {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                                    </select>
                                                    <ChevronDown
                                                        size={12}
                                                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                                                        style={{ color: tone.text }}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-[#4A4136]">{u.email}</td>
                                        <td className="px-5 py-3 text-[#8B8072]">{u.createdAt ? formatDate(u.createdAt) : "—"}</td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-medium ${active ? "text-[#3E4E3B]" : "text-[#7C4A4A]"}`}>{active ? "Active" : "Deactivated"}</span>
                                            {u.isVerified === false && (
                                                <span className="ml-2 rounded-full bg-[#F7EBD9] px-2 py-0.5 text-xs font-medium text-[#6B5426]">Not verified</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {u.isVerified === false && (
                                                    <GhostButton onClick={() => verifyUser(u)} disabled={busyId === u._id}>
                                                        Verify
                                                    </GhostButton>
                                                )}
                                                {!isMe && (
                                                    <GhostButton danger={active} onClick={() => setConfirm({ user: u, kind: "status", value: !active })}>
                                                        {active ? "Deactivate" : "Reactivate"}
                                                    </GhostButton>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {users && filtered.length === 0 && <EmptyState title="No accounts found" hint="Try a different search or role." />}
            </div>

            {confirm && (
                <ConfirmDialog
                    title={confirmText().title}
                    message={confirmText().message}
                    confirmLabel={confirmText().label}
                    danger={confirm.kind === "status" && !confirm.value}
                    loading={busyId === confirm.user._id}
                    onConfirm={applyChange}
                    onClose={() => setConfirm(null)}
                />
            )}

            {adding && (
                <AddUserModal
                    onClose={() => setAdding(false)}
                    onCreated={(user) => {
                        setUsers((prev) => [user, ...prev]);
                        setAdding(false);
                        notify("success", `${user.username} was added as ${ROLE_LABEL[user.role]}.`);
                    }}
                />
            )}
        </div>
    );
}

function AddUserModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ username: "", email: "", password: "", role: "staff" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const { data } = await api.post("/admin/users", form);
            onCreated(data);
        } catch (err) {
            setError(errMsg(err));
            setSaving(false);
        }
    };

    return (
        <Modal label="Add user" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <ModalHeader title="Add user" subtitle="Creates a verified account they can log in with right away." onClose={onClose} />
                <Field label="Username" htmlFor="u-name">
                    <input id="u-name" value={form.username} onChange={set("username")} className={inputCls} required autoFocus />
                </Field>
                <Field label="Email" htmlFor="u-email">
                    <input id="u-email" type="email" value={form.email} onChange={set("email")} className={inputCls} required />
                </Field>
                <Field label="Temporary password" htmlFor="u-pass" hint="At least 8 characters with a number. Ask them to change it after logging in.">
                    <input id="u-pass" type="text" value={form.password} onChange={set("password")} className={inputCls} required minLength={8} autoComplete="off" />
                </Field>
                <Field label="Role">
                    <Segmented label="Role" value={form.role} options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} onChange={(role) => setForm((f) => ({ ...f, role }))} />
                </Field>
                {error && <p role="alert" className="rounded-lg bg-[#F3E4E2] px-3 py-2 text-sm text-[#6B3838]">{error}</p>}
                <PrimaryButton type="submit" loading={saving} className="w-full">Create account</PrimaryButton>
            </form>
        </Modal>
    );
}