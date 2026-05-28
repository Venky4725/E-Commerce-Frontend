import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../../api/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";
import { Loader2, Pencil, Trash2, Plus, X, RefreshCw, Upload } from "lucide-react";
import { buildAssetUrl } from "../../api/endpoints";
import BulkUploadModal from "../../components/BulkUploadModal";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  stock_quantity: z.coerce.number().int().min(0, "Stock cannot be negative"),
});

// ── Product Form (create / edit) ─────────────────────────────────────────────
const ProductForm = ({ initial, onClose, onSaved }) => {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: initial ?? { name: "", description: "", price: "", stock_quantity: "" },
  });

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      let res;
      if (initial?.id) {
        res = await api.put(`/products/${initial.id}`, data);
      } else {
        res = await api.post("/products/", data);
      }

      if (imageFile && res.data?.id) {
        const form = new FormData();
        form.append("file", imageFile);
        await api.post(`/products/${res.data.id}/upload-image`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast({ title: initial?.id ? "Product updated" : "Product created" });
      onSaved();
    } catch (err) {
      toast({
        title: "Failed to save product",
        description: err.response?.data?.detail || "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <Card className="w-full max-w-lg dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="dark:text-white">{initial?.id ? "Edit Product" : "New Product"}</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              type="button"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {[
              { id: "name", label: "Product Name", placeholder: "e.g. Wireless Headphones", type: "text" },
              { id: "description", label: "Description", placeholder: "Optional description", type: "text" },
              { id: "price", label: "Price (₹)", placeholder: "e.g. 499", type: "number" },
              { id: "stock_quantity", label: "Stock Quantity", placeholder: "e.g. 50", type: "number" },
            ].map(({ id, label, placeholder, type }) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </label>
                <Input
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  {...register(id)}
                />
                {errors[id] && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    {errors[id].message}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : initial?.id ? "Save Changes" : "Create Product"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data: products = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/?skip=0&limit=1000");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      const previousProducts = queryClient.getQueryData(["products"]);
      queryClient.setQueryData(["products"], (current = []) => current.filter((p) => String(p.id) !== String(id)));
      return { previousProducts };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products-count"] });
      setDeletingId(null);
      toast({ title: "Product deleted" });
    },
    onError: (err, _id, context) => {
      queryClient.setQueryData(["products"], context?.previousProducts || []);
      setDeletingId(null);

      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.message || "";

      if (status === 404 || String(detail).toLowerCase().includes("not found")) {
        toast({ title: "Product already deleted", description: "The product was already removed.", variant: "default" });
        return;
      }

      toast({
        title: "Delete failed",
        description: detail || "Try again",
        variant: "destructive",
      });
    },
  });

  const requestDelete = (product) => {
    if (deletingId && String(deletingId) === String(product.id)) return;
    setConfirmTarget(product);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!confirmTarget?.id) return;
    setConfirmOpen(false);
    setDeletingId(confirmTarget.id);
    deleteMutation.mutate(confirmTarget.id);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products-count"] });
    setFormOpen(false);
    setEditing(null);
  };

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products-count"] });
    await refetch();
  };

  const deleteLoading = deleteMutation.isPending;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Products</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isFetching} className="flex items-center gap-2">
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? "Refreshing" : "Refresh"}
          </Button>
          <Button variant="secondary" onClick={() => setBulkOpen(true)} className="flex items-center gap-2">
            <Upload size={16} /> Bulk Upload
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="flex items-center gap-2">
            <Plus size={16} /> Add Product
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      )}

      {isError && (
        <div className="py-20 text-center">
          <p className="mb-4 text-red-500">Failed to load products.</p>
          <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2 mx-auto">
            <RefreshCw size={15} /> Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {products.length === 0 && <p className="py-10 text-center text-gray-500 dark:text-gray-400">No products yet.</p>}

          {products.map((product) => {
            const imageUrl = product.image_url ? buildAssetUrl(product.image_url) : null;
            const isThisDeleting = deletingId !== null && String(deletingId) === String(product.id);

            return (
              <Card key={product.id} className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' fill='%23f3f4f6'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <img
                        src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' fill='%23f3f4f6'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E"
                        alt="No image"
                        className="h-full w-full object-contain opacity-50 grayscale"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-800 dark:text-gray-200">{product.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ₹{Number(product.price).toFixed(2)} · Stock: {product.stock_quantity ?? "—"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditing(product); setFormOpen(true); }}
                      className="flex items-center gap-1"
                    >
                      <Pencil size={13} /> Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => requestDelete(product)}
                      disabled={deleteLoading && !isThisDeleting}
                      className="flex items-center gap-1"
                    >
                      {isThisDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={13} />}
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmOpen && confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-lg dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete "{confirmTarget.name}"?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Are you sure you want to delete this product?</p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" disabled={deleteLoading} onClick={() => setConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" disabled={deleteLoading} onClick={confirmDelete} className="gap-2">
                    {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Confirm
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {formOpen && (
        <ProductForm
          initial={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {bulkOpen && (
        <BulkUploadModal
          onClose={() => setBulkOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default React.memo(AdminProducts);

