import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import LoadingSpinner from "@/components/common/LoadingSpinner";
import ProtectedContent from "@/components/common/ProtectedContent";

import UserFormModal from "@/components/users/UserFormModal";
import UserEditModal from "@/components/users/UserEditModal";

import { UserRoleBadge } from "@/components/common/Badge";

import {
  userService,
  User,
} from "@/services/userService";

export default function UsersPage() {
  const queryClient = useQueryClient();

  const [page] = useState(1);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [isEditOpen, setIsEditOpen] =
    useState(false);

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["users", page],
    queryFn: () =>
      userService.list({
        page,
        size: 20,
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) =>
      userService.toggleActive(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      userService.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });

  const handleDelete = (
    user: User
  ) => {
    const confirmed =
      window.confirm(
        `Hapus user ${user.username}?`
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(user.id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="text-red-600">
          Gagal memuat data user.
        </div>
      </div>
    );
  }

  return (
    <ProtectedContent permission="users:read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Pengguna
            </h1>

            <p className="text-gray-500">
              Kelola akun sistem RIS
            </p>
          </div>

          <button
            onClick={() =>
              setIsModalOpen(true)
            }
            className="btn-primary"
          >
            + Tambah User
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">
                    Username
                  </th>

                  <th className="text-left p-3">
                    Nama
                  </th>

                  <th className="text-left p-3">
                    Email
                  </th>

                  <th className="text-left p-3">
                    Role
                  </th>

                  <th className="text-left p-3">
                    Status
                  </th>

                  <th className="text-right p-3">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {data?.items.map(
                  (user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3">
                        {user.username}
                      </td>

                      <td className="p-3">
                        {user.full_name}
                      </td>

                      <td className="p-3">
                        {user.email}
                      </td>

                      <td className="p-3">
                        <UserRoleBadge
                          role={user.role}
                        />
                      </td>

                      <td className="p-3">
                        <span
                          className={
                            user.is_active
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {user.is_active
                            ? "Aktif"
                            : "Nonaktif"}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsEditOpen(true);
                            }}
                          >
                            Edit
                          </button>

                          <button
                            className="btn-secondary"
                            onClick={() =>
                              toggleMutation.mutate(
                                user.id
                              )
                            }
                          >
                            {user.is_active
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                          </button>

                          <button
                            className="btn-danger"
                            onClick={() =>
                              handleDelete(
                                user
                              )
                            }
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <UserFormModal
          isOpen={isModalOpen}
          onClose={() =>
            setIsModalOpen(false)
          }
        />

        <UserEditModal
          isOpen={isEditOpen}
          user={selectedUser}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedUser(null);
          }}
        />
      </div>
    </ProtectedContent>
  );
}