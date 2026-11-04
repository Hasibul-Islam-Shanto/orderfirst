import { useState } from "react";
import { Plus, Pencil, Trash2, Armchair, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { tableSchema } from "../../lib/schemas";
import { useAdminTables, useCreateTable, useDeleteTable, useToggleTableAvailability, useUpdateTable } from "./admin-hooks";
import {
  PageHeader,
  Badge,
  EmptyState,
  ConfirmDialog,
  Modal,
  useToast,
} from "../../components/common/ui";
import { Field, errorProps } from "../../components/forms/form-field";
import type { RestaurantTable } from "../../types";
export function TableManagementPage() {
  const [page, setPage] = useState(1);
  const query = useAdminTables(page);
  const tables = query.data?.data ?? [];
  const remove = useDeleteTable();
  const toggle = useToggleTableAvailability();
  const [editor, setEditor] = useState<RestaurantTable | "new" | null>(null);
  const [deletion, setDeletion] = useState<RestaurantTable | null>(null);
  const toast = useToast();
  return (
    <>
      <PageHeader
        eyebrow="SET THE SCENE FOR GOOD TIMES"
        title="A little room for everyone."
        description="Manage seating, capacity, and availability."
        action={
          <button className="button" onClick={() => setEditor("new")}>
            <Plus size={18} /> Add table
          </button>
        }
      />
      <div className="info-box">
        <Armchair size={21} />
        <span>
          Availability controls new bookings. Existing reservations stay
          assigned when a table is disabled.
        </span>
      </div>
      {query.data && query.data.pagination.totalPages > 1 && <div className="dialog-actions"><button className="button secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {query.data.pagination.totalPages}</span><button className="button secondary" disabled={page >= query.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
      <div className="grid-3 table-grid">
        {tables.map((t) => {
          return (
            <article className="panel table-card" key={t.id}>
              <div className="order-card-top">
                <span className="table-icon">
                  <Armchair size={32} />
                </span>
                <Badge status={t.available ? "Available" : "Unavailable"} />
              </div>
              <h2>Table {t.number}</h2>
              <p className="muted">{t.area}</p>
              <p>
                <Users size={17} /> Up to {t.capacity} guests
              </p>
              <div className="order-card-bottom">
                <button
                  className={`switch ${t.available ? "on" : ""}`}
                  role="switch"
                  aria-checked={t.available}
                  aria-label={`Table ${t.number} availability`}
                  onClick={() => {
                    toggle.mutate({ id: t.id, available: !t.available }, { onSuccess: () => toast(`Table ${t.number} availability updated`), onError: (error) => toast(error.message) });
                  }}
                >
                  <span />
                </button>
                <div className="button-row">
                  <button
                    className="icon-button"
                    aria-label={`Edit table ${t.number}`}
                    onClick={() => setEditor(t)}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="icon-button danger-text"
                    title="Delete table"
                    aria-label={`Delete table ${t.number}`}
                    onClick={() => setDeletion(t)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {query.isPending && <p className="muted" aria-live="polite">Loading tables…</p>}
      {query.isError && <EmptyState title="Unable to load tables" description="Please try again." action={<button className="button" onClick={() => query.refetch()}>Retry</button>} />}
      {!query.isPending && !tables.length && (
        <EmptyState
          title="Let’s set the first table."
          description="Add a table to start accepting reservations."
        />
      )}
      {editor && (
        <TableForm
          table={editor === "new" ? undefined : editor}
          tables={tables}
          onClose={() => setEditor(null)}
        />
      )}{" "}
      {deletion && (
        <ConfirmDialog
          title="Delete table?"
          description={`Remove table ${deletion.number} from your restaurant? Past reservations will remain in history.`}
          onClose={() => setDeletion(null)}
          onConfirm={() => remove.mutate(deletion.id, { onSuccess: () => toast("Table deleted"), onError: (error) => toast(error.message) })}
        />
      )}
    </>
  );
}
function TableForm({
  table,
  tables,
  onClose,
}: {
  table?: RestaurantTable;
  tables: RestaurantTable[];
  onClose: () => void;
}) {
  const create = useCreateTable();
  const update = useUpdateTable();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof tableSchema>>({
    resolver: zodResolver(tableSchema),
    defaultValues: table ?? {
      number: Math.max(0, ...tables.map((t) => t.number)) + 1,
      capacity: 2,
      area: "Main dining",
      available: true,
    },
  });
  return (
    <Modal
      title={table ? "Edit table" : "Make room for more"}
      onClose={onClose}
    >
      <form
        noValidate
        onSubmit={handleSubmit((v) => {
          if (
            tables.some((t) => t.id !== table?.id && t.number === v.number)
          ) {
            setError("number", {
              message: "A table with this number already exists.",
            });
            return;
          }
          const mutation = table ? update : create;
          mutation.mutate({ id: table?.id, table: v }, { onSuccess: () => { toast("Table saved"); onClose(); }, onError: (error) => setError("root", { message: error.message }) });
        })}
      >
        <div className="form-grid">
          <Field
            id="number"
            label="Table number"
            error={errors.number?.message}
          >
            <input
              id="number"
              type="number"
              {...register("number", { valueAsNumber: true })}
              {...errorProps("number", errors.number?.message)}
            />
          </Field>
          <Field
            id="capacity"
            label="Capacity (1–8 guests)"
            error={errors.capacity?.message}
          >
            <input
              id="capacity"
              type="number"
              {...register("capacity", { valueAsNumber: true })}
              {...errorProps("capacity", errors.capacity?.message)}
            />
          </Field>
        </div>
        <Field id="area" label="Seating area" error={errors.area?.message}>
          <input
            id="area"
            {...register("area")}
            {...errorProps("area", errors.area?.message)}
          />
        </Field>
        <label className="check-label">
          <input type="checkbox" {...register("available")} /> Available for
          reservations
        </label>
        {errors.root && <p className="field-error" role="alert">{errors.root.message}</p>}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button">Save table</button>
        </div>
      </form>
    </Modal>
  );
}
