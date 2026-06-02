import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Modal from "@/components/common/Modal";

import {
  User,
  UserRole,
  userService,
} from "@/services/userService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

interface FormData {
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export default function UserEditModal({
  isOpen,
  onClose,
  user,
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
  } = useForm<FormData>();

  useEffect(() => {
    if (user) {
      reset({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      userService.update(user!.id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      onClose();
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Pengguna"
      size="lg"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div>
          <label className="label">
            Username
          </label>

          <input
            className="input bg-gray-100"
            value={user.username}
            disabled
          />
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
            Email
          </label>

          <input
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
            Role
          </label>

          <select
            className="input"
            {...register("role")}
          >
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register("is_active")}
          />

          <label>
            Pengguna Aktif
          </label>
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
              : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}