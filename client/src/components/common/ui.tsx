import {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  type ReactNode,
  type ImgHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";
import {
  Utensils,
  X,
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../../store/theme-store";
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="OrderFirst home">
      <span className="logo-icon">
        <Utensils size={20} />
      </span>
      Order<span>First</span>
      <span className="logo-dot">.</span>
    </Link>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`badge badge-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      {status}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <ShoppingBag size={30} />
      </span>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {action}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-input">
      <Search size={19} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="icon-button"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
export function Quantity({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (n: number) => void;
  name: string;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label={`Decrease ${name} quantity`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={15} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        aria-label={`Increase ${name} quantity`}
        disabled={value >= 20}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  const label = `Switch to ${nextTheme} mode`;
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    el?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {description && (
        <p id="modal-description" className="muted">
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}
export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} description={description} onClose={onClose}>
      <div className="dialog-actions">
        <button className="button secondary" onClick={onClose}>
          Keep it
        </button>
        <button
          className="button danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Yes, {title.toLowerCase().replace("?", "")}
        </button>
      </div>
    </Modal>
  );
}
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<{ id: number; text: string }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const toast = (text: string) => {
    const id = Date.now() + Math.random();
    setMessages((m) => [...m.slice(-2), { id, text }]);
    timers.current.push(
      setTimeout(() => setMessages((m) => m.filter((t) => t.id !== id)), 4000),
    );
  };
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className="toast">
            <span>
              <Check size={16} />
            </span>
            {m.text}
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setMessages((t) => t.filter((x) => x.id !== m.id))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function Skeleton() {
  return (
    <div
      className="shell skeleton-page"
      role="status"
      aria-label="Loading page"
    >
      <div className="skeleton skeleton-title" />
      <div className="grid-3">
        {[1, 2, 3].map((n) => (
          <div className="skeleton skeleton-card" key={n} />
        ))}
      </div>
      <span className="sr-only">Loading OrderFirst</span>
    </div>
  );
}
export function Image({
  src,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="image-fallback" role="img" aria-label={alt}>
      <Utensils size={38} />
      <span>{alt}</span>
    </div>
  ) : (
    <img {...props} src={src} alt={alt} onError={() => setFailed(true)} />
  );
}
