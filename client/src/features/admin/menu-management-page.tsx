import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAdminMenuItems, useCategoriesAdmin, useDeleteCategory, useDeleteMenuItem, useToggleMenuAvailability } from "./admin-hooks";
import {
  PageHeader,
  SearchInput,
  Badge,
  EmptyState,
  ConfirmDialog,
  useToast,
} from "../../components/common/ui";
import { MenuForm, CategoryForm } from "./menu-form";
import type { MenuItem, Category } from "../../types";
import { money } from "../../utils/format";
import { useDebouncedValue } from "../../lib/use-debounced-value";
export function MenuManagementPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const categoriesQuery = useCategoriesAdmin();
  const categories = categoriesQuery.data ?? [];
  const menuQuery = useAdminMenuItems({ page, limit: 10, search: debouncedSearch || undefined, category: category === "all" ? undefined : category, available: availability === "all" ? undefined : availability === "available" });
  const menu = menuQuery.data?.data ?? [];
  const toggle = useToggleMenuAvailability();
  const deleteItem = useDeleteMenuItem();
  const deleteCategory = useDeleteCategory();
  const toast = useToast();
  const [editor, setEditor] = useState<MenuItem | "new" | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<Category | "new" | null>(
    null,
  );
  const [deletion, setDeletion] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);
  const [tab, setTab] = useState("Dishes");
  const items = menu;
  return (
    <>
      <PageHeader
        eyebrow="THE HEART OF YOUR RESTAURANT"
        title="A menu worth coming back for."
        description="Keep your dishes fresh and your guests inspired."
        action={
          <button
            className="button"
            onClick={() =>
              tab === "Dishes" ? setEditor("new") : setCategoryEditor("new")
            }
          >
            <Plus size={18} />
            Add {tab === "Dishes" ? "dish" : "category"}
          </button>
        }
      />
      <div className="category-tabs">
        {["Dishes", "Categories"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}{" "}
            <span>
              {t === "Dishes" ? menuQuery.data?.pagination.total ?? 0 : categories.length}
            </span>
          </button>
        ))}
      </div>
      {tab === "Dishes" ? (
        <>
          <div className="menu-toolbar">
            <SearchInput
              value={search}
              onChange={(value) => { setSearch(value); setPage(1); }}
              placeholder="Search your dishes…"
            />
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter availability"
              value={availability}
              onChange={(e) => { setAvailability(e.target.value); setPage(1); }}
            >
              <option value="all">All availability</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          {menuQuery.data && menuQuery.data.pagination.totalPages > 1 && <div className="dialog-actions"><button className="button secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {menuQuery.data.pagination.totalPages}</span><button className="button secondary" disabled={page >= menuQuery.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
          <div className="panel table-panel">
            {menuQuery.isPending ? <p className="muted" aria-live="polite">Loading menu items…</p> : menuQuery.isError ? <EmptyState title="Unable to load menu items" description="Please try again." action={<button className="button" onClick={() => menuQuery.refetch()}>Retry</button>} /> : items.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Dish</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="table-dish">
                            <img src={item.image} alt="" />
                            <span>
                              <strong>{item.name}</strong>
                              <small>
                                {item.prepTime} min{" "}
                                {item.featured ? "· House favorite" : ""}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          {
                            categories.find(
                              (c) => c.id === item.categoryId,
                            )?.name
                          }
                        </td>
                        <td>
                          <strong>{money(item.price)}</strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`switch ${item.available ? "on" : ""}`}
                            role="switch"
                            aria-checked={item.available}
                            aria-label={`${item.name} availability`}
                            onClick={() => {
                              toggle.mutate({ id: item.id, available: !item.available }, { onSuccess: () => toast(`${item.name} ${item.available ? "unavailable" : "available"}`), onError: (error) => toast(error.message) });
                            }}
                          >
                            <span />
                          </button>
                          <span className="switch-label">
                            {item.available ? "Available" : "Unavailable"}
                          </span>
                        </td>
                        <td>
                          <div className="button-row">
                            <button
                              className="icon-button"
                              aria-label={`Edit ${item.name}`}
                              onClick={() => setEditor(item)}
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              className="icon-button danger-text"
                              aria-label={`Delete ${item.name}`}
                              onClick={() =>
                                setDeletion({
                                  title: "Delete dish?",
                                  description: `Remove ${item.name} from the menu? Existing order history will be kept.`,
                                  action: () => deleteItem.mutate(item.id, { onError: (error) => toast(error.message) }),
                                })
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No dishes found"
                description="Try a different search or add a new dish."
              />
            )}
          </div>
        </>
      ) : (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Dishes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => {
                  const count = menu.filter(
                    (m) => m.categoryId === c.id,
                  ).length;
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>
                          {c.emoji} {c.name}
                        </strong>
                      </td>
                      <td>
                        <Badge status={`${count} dishes`} />
                      </td>
                      <td>
                        <div className="button-row">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${c.name}`}
                            onClick={() => setCategoryEditor(c)}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            disabled={count > 0}
                            title={
                              count
                                ? "Move or remove this category’s dishes first"
                                : "Delete empty category"
                            }
                            aria-label={`Delete ${c.name}`}
                            onClick={() =>
                              setDeletion({
                                title: "Delete category?",
                                description: `Remove the empty ${c.name} category?`,
                                  action: () => deleteCategory.mutate(c.id, { onError: (error) => toast(error.message) }),
                              })
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                          {count > 0 && (
                            <small className="muted">Contains dishes</small>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editor && (
        <MenuForm
          item={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}{" "}
      {categoryEditor && (
        <CategoryForm
          category={categoryEditor === "new" ? undefined : categoryEditor}
          onClose={() => setCategoryEditor(null)}
        />
      )}{" "}
      {deletion && (
        <ConfirmDialog
          title={deletion.title}
          description={deletion.description}
          onClose={() => setDeletion(null)}
          onConfirm={() => {
            deletion.action();
            toast("Deleted successfully");
          }}
        />
      )}
    </>
  );
}
