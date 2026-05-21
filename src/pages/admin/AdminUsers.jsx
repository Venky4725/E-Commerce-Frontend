import React, { useState, useMemo, useEffect, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Trash2, UserCheck, Users, Search, ChevronLeft, ChevronRight, Package, Shield } from "lucide-react";


import api from "../../api/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/toast";
import { extractErrorMessage } from "../../lib/errorUtils";
import { useDebounce } from "../../hooks/useDebounce";

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const size = 10;

  const { data: users = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/admin/users");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/all");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const userOrderCount = useMemo(() => {
    return allOrders.reduce((acc, order) => {
      if (order.user_id) {
        acc[order.user_id] = (acc[order.user_id] || 0) + 1;
      }
      return acc;
    }, {});
  }, [allOrders]);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return users;
    const lower = debouncedSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.username && u.username.toLowerCase().includes(lower)) ||
        (u.email && u.email.toLowerCase().includes(lower))
    );
  }, [users, debouncedSearch]);

  const totalPages = Math.ceil(filteredUsers.length / size) || 1;
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((page - 1) * size, page * size);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/users/${id}/active?is_active=false`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      const previous = queryClient.getQueryData(["admin-users"]);
      queryClient.setQueryData(["admin-users"], (current = []) =>
        current.filter((user) => user.id !== id)
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      queryClient.setQueryData(["admin-users"], context?.previous || []);
      toast({ title: "Delete failed", description: extractErrorMessage(err), variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });



  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900 dark:text-white">
            <Users size={28} className="text-blue-600 dark:text-blue-500" /> User Management
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">View customers and manage admin privileges.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="text"
              placeholder="Search users..."
              className="pl-9 dark:bg-gray-800 dark:border-gray-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              queryClient.invalidateQueries({ queryKey: ["admin-users"] });
              await refetch();
            }}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="py-20 text-center">
          <p className="mb-4 text-red-500">Failed to load users.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {paginatedUsers.map((user) => (
            <Card key={user.id || user.email} className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {user.is_admin ? <Shield size={20} /> : <UserCheck size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">{user.username || user.email}</p>
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    <Package size={14} />
                    <span>{userOrderCount[user.id] || 0} Orders</span>
                  </div>
                  <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {user.is_admin ? "Admin" : "Customer"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => window.confirm(`Delete ${user.email}?`) && deleteMutation.mutate(user.id)}
                    disabled={!user.id || deleteMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </CardContent>

            </Card>
          ))}
          {filteredUsers.length === 0 && (
            <Card className="dark:border-gray-700 dark:bg-gray-800">
              <CardContent className="py-16 text-center text-gray-500 dark:text-gray-400">
                No users found.
              </CardContent>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * size + 1} to {Math.min(page * size, filteredUsers.length)} of {filteredUsers.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(AdminUsers);