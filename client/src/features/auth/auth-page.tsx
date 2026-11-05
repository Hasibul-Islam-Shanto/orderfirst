import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { loginSchema, registerSchema } from "../../lib/schemas";
import { Field, errorProps } from "../../components/forms/form-field";
import { useLogin, useRegister } from "./auth-hooks";
import { ApiError } from "../../lib/api-client";
import { useToast, Image } from "../../components/common/ui";
import { photo } from "../../mocks/data";
type Values = z.infer<typeof registerSchema>;
export function AuthPage({ registerMode = false }: { registerMode?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [show, setShow] = useState(false);
  const login = useLogin();
  const createAccount = useRegister();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(
      registerMode ? registerSchema : loginSchema.extend({ name: z.string() }),
    ),
    defaultValues: { name: "", email: "", password: "" },
  });
  const submit = async (values: Values) => {
    try {
      const user = registerMode
        ? await createAccount.mutateAsync(values)
        : await login.mutateAsync({
            email: values.email,
            password: values.password,
          });
      const from = (location.state as { from?: string } | null)?.from;
      if (!user.emailVerifiedAt) {
        toast(
          registerMode
            ? "We sent a verification code to your email."
            : "Please verify your email to continue.",
        );
        navigate("/verify-email", {
          replace: true,
          state: {
            ...(typeof location.state === "object" && location.state
              ? location.state
              : {}),
            ...(registerMode ? { codeJustSent: true } : {}),
          },
        });
        return;
      }
      toast(registerMode ? "Welcome to the table!" : "Welcome back!");
      navigate(
        user.role === "admin"
          ? "/admin/overview"
          : from?.startsWith("/") && !from.startsWith("/admin")
            ? from
            : "/account",
        { replace: true, state: location.state },
      );
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setError("root", {
        message:
          apiError?.message ?? "We couldn't sign you in. Please try again.",
      });
    }
  };
  return (
    <div className="shell page auth-grid">
      <div className="auth-image">
        <Image
          src={photo("photo-1517248135467-4c7edcad34c4")}
          alt="Warm and inviting restaurant interior"
        />
        <div>
          <p className="eyebrow">A LITTLE MORE TO LOOK FORWARD TO</p>
          <h2>
            Your favorites.
            <br />
            Your people.
            <br />
            Your place.
          </h2>
          <p>Good moments start at OrderFirst.</p>
        </div>
      </div>
      <div className="auth-form">
        <p className="eyebrow">WELCOME TO THE TABLE</p>
        <h1>
          {registerMode ? "Make yourself at home." : "Good to see you again."}
        </h1>
        <p className="muted">
          {registerMode
            ? "Create an account for your next great meal."
            : "Log in to order your favorites or save your seat."}
        </p>
        <form onSubmit={handleSubmit(submit)} noValidate>
          {registerMode && (
            <Field id="name" label="Full name" error={errors.name?.message}>
              <input
                id="name"
                autoComplete="name"
                {...register("name")}
                {...errorProps("name", errors.name?.message)}
              />
            </Field>
          )}
          <Field id="email" label="Email address" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
              {...errorProps("email", errors.email?.message)}
            />
          </Field>
          <Field
            id="password"
            label="Password"
            error={errors.password?.message}
          >
            <div className="password-input">
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete={
                  registerMode ? "new-password" : "current-password"
                }
                placeholder="At least 8 characters"
                {...register("password")}
                {...errorProps("password", errors.password?.message)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {errors.root && (
            <p role="alert" className="field-error">
              {errors.root.message}
            </p>
          )}
          <button className="button full" disabled={isSubmitting}>
            {registerMode ? "Create account" : "Log in"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {registerMode ? "Already a regular?" : "New around here?"}{" "}
          <Link
            className="text-link"
            to={registerMode ? "/login" : "/register"}
            state={location.state}
          >
            {registerMode ? "Log in" : "Create an account"}
          </Link>
        </p>
        {!registerMode && (
          <div className="demo-box">
            <strong>Take a look around</strong>
            <p className="muted">
              Choose a demo account, then log in. Password: password123
            </p>
            <div className="button-row">
              {(["customer", "admin"] as const).map((role) => (
                <button
                  key={role}
                  className={`button secondary small ${params.get("role") === role ? "selected" : ""}`}
                  onClick={() => {
                    setValue("email", `${role}@orderfirst.dev`);
                    setValue("password", "password123");
                  }}
                >
                  Use {role} demo
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="small-text muted">
          Your session is protected with a secure HTTP-only cookie.
        </p>
      </div>
    </div>
  );
}
