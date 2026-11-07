import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, CalendarDays, LogOut, ArrowRight, UserPen, KeyRound } from "lucide-react";
import { useCurrentUser, useLogout, useUpdateProfile, useChangePassword } from "../auth/auth-hooks";
import { useMyOrders } from "../orders/order-hooks";
import { useMyReservations } from "../reservations/reservation-hooks";
import { isUpcoming } from "../../lib/reservation-availability";
import { PageHeader, Badge, Modal, useToast } from "../../components/common/ui";
import { dateLabel, money } from "../../utils/format";

export function ProfilePage() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const orderQuery = useMyOrders();
  const reservationQuery = useMyReservations();
  const navigate = useNavigate();
  const toast = useToast();

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) return null;
  const orders = orderQuery.data?.data ?? [];
  const upcoming = (reservationQuery.data?.data ?? []).filter(isUpcoming);

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    updateProfile.mutate(
      { name: nameInput.trim() },
      {
        onSuccess: () => {
          toast("Profile name updated successfully");
          setEditNameOpen(false);
        },
        onError: (err) => toast(err.message),
      },
    );
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    setPasswordError(null);
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast("Password changed successfully");
          setPasswordOpen(false);
          setCurrentPassword("");
          setNewPassword("");
        },
        onError: (err) => setPasswordError(err.message),
      },
    );
  };

  return (
    <div className="shell page">
      <PageHeader
        eyebrow="YOUR CORNER OF ORDERFIRST"
        title={`Hello, ${user.name.split(" ")[0]}.`}
        description="Your favorites, your plans, all in one place."
      />
      <div className="two-column">
        <div className="panel profile-card">
          <div className="profile-avatar">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <h2>{user.name}</h2>
          <p className="muted">{user.email}</p>
          <Badge status={user.role} />
          <div className="summary-divider" />
          <div className="button-col" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
            <button
              className="button secondary small"
              onClick={() => {
                setNameInput(user.name);
                setEditNameOpen(true);
              }}
            >
              <UserPen size={16} /> Edit profile name
            </button>
            <button
              className="button secondary small"
              onClick={() => {
                setPasswordError(null);
                setCurrentPassword("");
                setNewPassword("");
                setPasswordOpen(true);
              }}
            >
              <KeyRound size={16} /> Change password
            </button>
            <button
              className="button secondary small"
              onClick={() => {
                logout.mutate(undefined, { onSuccess: () => navigate("/") });
              }}
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </div>
        <div className="profile-sections">
          <div className="panel">
            <div className="section-heading">
              <h2>
                <ShoppingBag size={21} /> Recent orders
              </h2>
              <Link className="text-link" to="/my-orders">
                View all <ArrowRight size={16} />
              </Link>
            </div>
            {orders.length ? (
              orders.slice(0, 3).map((o) => (
                <div className="summary-line" key={o.id}>
                  <span>
                    {o.id}
                    <small className="muted">{dateLabel(o.date)}</small>
                  </span>
                  <Badge status={o.status} />
                  <strong>{money(o.total)}</strong>
                </div>
              ))
            ) : (
              <p className="muted">
                Your first great meal is just a few clicks away.
              </p>
            )}
          </div>
          <div className="panel">
            <h2>
              <CalendarDays size={21} /> Your next gathering
            </h2>
            {upcoming.length ? (
              <p>
                {dateLabel(upcoming[0].date)} · {upcoming[0].guests} guests{" "}
                <Badge status={upcoming[0].status} />
              </p>
            ) : (
              <p className="muted">No upcoming plans yet. Let’s change that.</p>
            )}
            <Link
              className="text-link"
              to={upcoming.length ? "/my-reservations" : "/reservations/new"}
            >
              {upcoming.length ? "Manage reservations" : "Find your table"}{" "}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {editNameOpen && (
        <Modal title="Edit Profile Name" onClose={() => setEditNameOpen(false)}>
          <form onSubmit={handleUpdateName} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label>
              <span className="small-text muted">Full Name</span>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                style={{ width: "100%", marginTop: "0.25rem" }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setEditNameOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={updateProfile.isPending}>
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {passwordOpen && (
        <Modal title="Change Password" onClose={() => setPasswordOpen(false)}>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label>
              <span className="small-text muted">Current Password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{ width: "100%", marginTop: "0.25rem" }}
              />
            </label>
            <label>
              <span className="small-text muted">New Password (at least 8 characters)</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ width: "100%", marginTop: "0.25rem" }}
              />
            </label>
            {passwordError && <p className="field-error">{passwordError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setPasswordOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={changePassword.isPending}>
                Update password
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
