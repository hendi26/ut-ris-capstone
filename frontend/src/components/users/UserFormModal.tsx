import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Modal from "@/components/common/Modal";
import { userService, UserRole } from "@/services/userService";

interface UserFormData {
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserFormModal({
  isOpen,
  onClose,
}: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<UserFormData>();

  const mutation = useMutation({
    mutationFn: (data: UserFormData) =>
      userService.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      reset();
      onClose();
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };

  const getErrorMessage = () => {
    const error = mutation.error as {
      response?: {
        data?: {
          detail?: unknown;
        };
      };
    };

    const detail = error?.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as {
        msg?: string;
      };

      return first.msg ?? "Validasi gagal";
    }

    return "Terjadi kesalahan";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Pengguna Baru"
      size="lg"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {getErrorMessage()}
          </div>
        )}

        <div>
          <label className="label">
            Username
          </label>

          <input
            className="input"
            {...register("username", {
              required: "Username wajib diisi",
            })}
          />

          {errors.username && (
            <p className="text-xs text-red-600 mt-1">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <label className="label">
            Email
          </label>

          <input
            type="email"
            className="input"
            {...register("email", {
              required: "Email wajib diisi",
            })}
          />

          {errors.email && (
            <p className="text-xs text-red-600 mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="label">
            Nama Lengkap
          </label>

          <input
            className="input"
            {...register("full_name", {
              required: "Nama wajib diisi",
            })}
          />

          {errors.full_name && (
            <p className="text-xs text-red-600 mt-1">
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div>
          <label className="label">
            Role
          </label>

          <select
            className="input"
            {...register("role", {
              required: "Role wajib dipilih",
            })}
          >
            <option value="">
              Pilih Role
            </option>

            <option value="admin">
              Admin
            </option>

            <option value="radiolog">
              Radiolog
            </option>

            <option value="dokter">
              Dokter
            </option>

            <option value="resepsionis">
              Resepsionis
            </option>

            <option value="patient">
              Pasien
            </option>
          </select>
        </div>

        <div>
          <label className="label">
            Password
          </label>

          <input
            type="password"
            className="input"
            {...register("password", {
              required: "Password wajib diisi",
              minLength: {
                value: 8,
                message: "Password minimal 8 karakter",
              },
            })}
          />

          {errors.password && (
            <p className="text-xs text-red-600 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              mutation.isPending
            }
            className="btn-primary"
          >
            {mutation.isPending
              ? "Menyimpan..."
              : "Tambah User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}