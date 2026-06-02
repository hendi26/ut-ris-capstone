import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();

  const setAuth = useAuthStore(
    (s) => s.setAuth
  );

  const [showPassword, setShowPassword] =
    useState(false);

  const [serverError, setServerError] =
    useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginForm>();

  const onSubmit = async (
    data: LoginForm
  ) => {
    setServerError(null);

    try {
      const response =
        await authService.login(data);

      setAuth(
        response.user,
        response.access_token,
        response.refresh_token
      );

      // Redirect berdasarkan role
      if (
        response.user.role === "patient"
      ) {
        navigate(
          "/patient/profile",
          {
            replace: true,
          }
        );
      } else {
        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      }
    } catch (err: unknown) {
      const message =
        (
          err as {
            response?: {
              data?: {
                detail?: string;
              };
            };
          }
        )?.response?.data?.detail ??
        "Terjadi kesalahan. Coba lagi.";

      setServerError(message);
    }
  };

  return (
    <div className="card p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Masuk ke Sistem
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Masukkan kredensial akun
          Anda untuk melanjutkan
        </p>
      </div>

      <form
        onSubmit={handleSubmit(
          onSubmit
        )}
        noValidate
        className="space-y-5"
      >
        {/* Server Error */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="label"
          >
            Username
          </label>

          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="Masukkan username"
            className={`input ${
              errors.username
                ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                : ""
            }`}
            {...register(
              "username",
              {
                required:
                  "Username wajib diisi",
              }
            )}
          />

          {errors.username && (
            <p className="mt-1 text-xs text-red-600">
              {
                errors.username
                  .message
              }
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="label"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              placeholder="Masukkan password"
              className={`input pr-10 ${
                errors.password
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : ""
              }`}
              {...register(
                "password",
                {
                  required:
                    "Password wajib diisi",
                }
              )}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (v) => !v
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={
                showPassword
                  ? "Sembunyikan password"
                  : "Tampilkan password"
              }
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {
                errors.password
                  .message
              }
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full py-2.5"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memproses...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Masuk
            </span>
          )}
        </button>
      </form>

      {/* Dev Accounts */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 font-medium mb-2">
          Akun Development:
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <p className="text-xs text-gray-400">admin / admin123</p>
          <p className="text-xs text-gray-400">radiolog1 / Password123!</p>
          <p className="text-xs text-gray-400">dokter1 / Password123!</p>
          <p className="text-xs text-gray-400">resepsionis1 / Password123!</p>
          <p className="text-xs text-gray-400">patient1 / Password123!</p>
        </div>
      </div>
    </div>
  );
}