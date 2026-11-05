import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  CalendarDays,
  Users,
  Clock,
  ArrowRight,
  MapPin,
  Check,
  Armchair,
} from "lucide-react";
import { useCurrentUser } from "../auth/auth-hooks";
import {
  reservationDate,
  useCreateReservation,
  useReservationAvailability,
} from "./reservation-hooks";
import { reservationSchema } from "../../lib/schemas";
import { Field, errorProps } from "../../components/forms/form-field";
import { PageHeader, useToast } from "../../components/common/ui";
import { localDate, timeLabel, dateLabel, times } from "../../utils/format";
import { ApiError } from "../../lib/api-client";
import {
  readReservationDraft,
  reservationAuthState,
} from "./reservation-draft";
type Values = z.infer<typeof reservationSchema>;
export function ReservationPage() {
  const [renderedAt] = useState(() => Date.now());
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(reservationSchema),
    defaultValues: readReservationDraft(location.state) ?? {
      date: localDate(1),
      time: "19:00",
      guests: 2,
      tableId: "",
      request: "",
    },
  });
  const values = useWatch({ control });
  const date = values.date ?? localDate(1);
  const time = values.time ?? "19:00";
  const guests = values.guests ?? 2;
  const availability = useReservationAvailability(date, time, guests);
  const available = availability.data ?? [];
  const createReservation = useCreateReservation();
  const chosen = available.find((t) => t.id === values.tableId);
  const change = () => setValue("tableId", "");
  const submit = async (v: Values) => {
    if (!user) {
      navigate("/login", { state: reservationAuthState(v) });
      return;
    }
    if (user.role !== "customer") {
      setError("root", {
        message: "Please use a customer account to reserve a table.",
      });
      return;
    }
    if (!user.emailVerifiedAt) {
      navigate("/verify-email", { state: reservationAuthState(v) });
      return;
    }
    if (!available.some((t) => t.id === v.tableId)) {
      setError("tableId", {
        message: "That table is no longer available. Choose another.",
      });
      return;
    }
    try {
      const saved = await createReservation.mutateAsync({
        restaurantTableId: v.tableId,
        reservationDate: reservationDate(v.date, v.time),
        guestCount: v.guests,
        specialRequest: v.request || undefined,
      });
      toast("Your reservation request is in!");
      navigate(`/reservation-confirmation/${saved.id}`);
    } catch (error) {
      setError("root", {
        message:
          error instanceof ApiError
            ? error.message
            : "We couldn't save your reservation.",
      });
    }
  };
  return (
    <div className="shell page">
      <PageHeader
        eyebrow="GOOD COMPANY STARTS HERE"
        title="A seat for your next memory."
        description="Pick a time, bring your people. We’ll take care of the rest."
      />
      <form className="two-column" onSubmit={handleSubmit(submit)} noValidate>
        <div className="panel form-panel">
          <div className="step-title">
            <span>01</span>
            <h2>Make it a date.</h2>
          </div>
          <div className="form-grid">
            <Field
              id="date"
              label="When are you joining us?"
              error={errors.date?.message}
            >
              <input
                id="date"
                type="date"
                min={localDate()}
                max={localDate(90)}
                {...register("date", { onChange: change })}
                {...errorProps("date", errors.date?.message)}
              />
            </Field>
            <Field
              id="guests"
              label="How many guests?"
              error={errors.guests?.message}
            >
              <select
                id="guests"
                {...register("guests", {
                  valueAsNumber: true,
                  onChange: change,
                })}
                {...errorProps("guests", errors.guests?.message)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <fieldset>
            <legend>Choose your time</legend>
            <div className="time-grid">
              {times.map((slot) => {
                const enabled =
                  new Date(`${date}T${slot}:00`).getTime() > renderedAt;
                return (
                  <label
                    className={`time-choice ${values.time === slot ? "selected" : ""} ${!enabled ? "disabled" : ""}`}
                    key={slot}
                  >
                    <input
                      type="radio"
                      value={slot}
                      disabled={!enabled}
                      {...register("time", { onChange: change })}
                    />
                    {timeLabel(slot)}
                  </label>
                );
              })}
            </div>
            {errors.time && (
              <p className="field-error" role="alert">
                {errors.time.message}
              </p>
            )}
          </fieldset>
          <div className="step-title">
            <span>02</span>
            <h2>Find your favorite spot.</h2>
          </div>
          <p className="muted small-text">
            Tables are reserved for 90 minutes. Select an available table.
          </p>
          <div className="table-choices">
            {availability.isFetching && (
              <p className="muted" aria-live="polite">
                Checking available tables…
              </p>
            )}
            {available.map((t) => (
              <label
                key={t.id}
                className={`table-choice ${values.tableId === t.id ? "selected" : ""}`}
              >
                <input type="radio" value={t.id} {...register("tableId")} />
                <Armchair size={25} />
                <strong>Table {t.number}</strong>
                <span>
                  {t.area} · Up to {t.capacity}
                </span>
                {values.tableId === t.id && (
                  <Check className="table-check" size={16} />
                )}
              </label>
            ))}
          </div>
          {!available.length && (
            <p className="info-box">
              No tables fit this selection. Try another time or a smaller party.
            </p>
          )}
          {errors.tableId && (
            <p className="field-error" role="alert">
              {errors.tableId.message}
            </p>
          )}
          <Field
            id="request"
            label="Make it a little more special (optional)"
            error={errors.request?.message}
          >
            <textarea
              id="request"
              rows={3}
              placeholder="A celebration, dietary needs, or a favorite corner…"
              {...register("request")}
              {...errorProps("request", errors.request?.message)}
            />
          </Field>
          {errors.root && (
            <p className="field-error" role="alert">
              {errors.root.message}
            </p>
          )}
        </div>
        <aside className="panel reservation-summary">
          <div className="reservation-summary-header">
            <span className="eyebrow">YOUR LITTLE GET-TOGETHER</span>
            <h2>We’ll save you a seat.</h2>
          </div>
          <div className="reservation-summary-content">
            <p>
              <CalendarDays size={19} />
              <span>
                <small>Date</small>
                <strong>
                  {values.date ? dateLabel(values.date) : "Choose a date"}
                </strong>
              </span>
            </p>
            <p>
              <Clock size={19} />
              <span>
                <small>Time</small>
                <strong>{timeLabel(time)}</strong>
              </span>
            </p>
            <p>
              <Users size={19} />
              <span>
                <small>Your party</small>
                <strong>{values.guests} guests</strong>
              </span>
            </p>
            <p>
              <Armchair size={19} />
              <span>
                <small>Your table</small>
                <strong>
                  {chosen
                    ? `Table ${chosen.number} · ${chosen.area}`
                    : "Select your spot"}
                </strong>
              </span>
            </p>
            <div className="summary-divider" />
            <p className="small-text muted">
              <MapPin size={17} />
              24 Garden Street, Brooklyn, NY
            </p>
            <button className="button full" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving your seat…"
                : user
                  ? "Confirm reservation"
                  : "Log in to reserve"}
              <ArrowRight size={17} />
            </button>
            <p className="small-text muted">
              No deposit needed. Plans change? You can cancel from your
              reservations.
            </p>
            {!user && (
              <Link
                className="text-link"
                to="/register"
                state={reservationAuthState(getValues())}
              >
                New here? Create an account
              </Link>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
