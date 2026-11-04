import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { menuSchema, categorySchema } from "../../lib/schemas";
import { useCategoriesAdmin, useCreateMenuItem, useSaveCategory, useUpdateMenuItem } from "./admin-hooks";
import { Field, errorProps } from "../../components/forms/form-field";
import { Modal, useToast } from "../../components/common/ui";
import type { MenuItem } from "../../types";
type Values = z.infer<typeof menuSchema>;
export function MenuForm({
  item,
  onClose,
}: {
  item?: MenuItem;
  onClose: () => void;
}) {
  const categories = useCategoriesAdmin().data ?? [];
  const create = useCreateMenuItem();
  const update = useUpdateMenuItem();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(menuSchema),
    defaultValues: item ?? {
      name: "",
      description: "",
      categoryId: categories[0]?.id ?? "",
      price: 0,
      image: "",
      prepTime: 15,
      featured: false,
      available: true,
      vegetarian: false,
    },
  });
  const submit = (v: Values) => {
    const mutation = item ? update : create;
    mutation.mutate({ id: item?.id, item: v }, { onSuccess: () => { toast(`${v.name} saved`); onClose(); } });
  };
  return (
    <Modal
      title={item ? "Edit dish" : "Something new on the menu"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(submit)} noValidate>
        <Field id="name" label="Dish name" error={errors.name?.message}>
          <input
            id="name"
            {...register("name")}
            {...errorProps("name", errors.name?.message)}
          />
        </Field>
        <Field
          id="description"
          label="Description"
          error={errors.description?.message}
        >
          <textarea
            id="description"
            rows={3}
            {...register("description")}
            {...errorProps("description", errors.description?.message)}
          />
        </Field>
        <div className="form-grid">
          <Field
            id="categoryId"
            label="Category"
            error={errors.categoryId?.message}
          >
            <select
              id="categoryId"
              {...register("categoryId")}
              {...errorProps("categoryId", errors.categoryId?.message)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="price" label="Price ($)" error={errors.price?.message}>
            <input
              id="price"
              type="number"
              step="0.01"
              {...register("price", { valueAsNumber: true })}
              {...errorProps("price", errors.price?.message)}
            />
          </Field>
        </div>
        <Field id="image" label="Image URL" error={errors.image?.message}>
          <input
            id="image"
            type="url"
            placeholder="https://images.unsplash.com/…"
            {...register("image")}
            {...errorProps("image", errors.image?.message)}
          />
        </Field>
        <Field
          id="prepTime"
          label="Preparation time (minutes)"
          error={errors.prepTime?.message}
        >
          <input
            id="prepTime"
            type="number"
            {...register("prepTime", { valueAsNumber: true })}
            {...errorProps("prepTime", errors.prepTime?.message)}
          />
        </Field>
        <div className="check-row">
          <label>
            <input type="checkbox" {...register("available")} /> Available
          </label>
          <label>
            <input type="checkbox" {...register("featured")} /> Featured
          </label>
          <label>
            <input type="checkbox" {...register("vegetarian")} /> Vegetarian
          </label>
        </div>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button">Save dish</button>
        </div>
      </form>
    </Modal>
  );
}
export function CategoryForm({
  category,
  onClose,
}: {
  category?: { id: string; name: string; emoji: string };
  onClose: () => void;
}) {
  const save = useSaveCategory();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "" },
  });
  return (
    <Modal
      title={category ? "Edit category" : "Add category"}
      onClose={onClose}
    >
      <form
        noValidate
        onSubmit={handleSubmit((v) => {
          save.mutate({ id: category?.id, name: v.name }, { onSuccess: () => { toast("Category saved"); onClose(); }, onError: (error) => setError("name", { message: error.message }) });
        })}
      >
        <Field id="name" label="Category name" error={errors.name?.message}>
          <input
            id="name"
            {...register("name")}
            {...errorProps("name", errors.name?.message)}
          />
        </Field>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button">Save category</button>
        </div>
      </form>
    </Modal>
  );
}
