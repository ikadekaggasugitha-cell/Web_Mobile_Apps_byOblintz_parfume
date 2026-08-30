'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LoadingPage } from '@/components/ui/Loading';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProductCard } from '@/components/product/ProductCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { PageHeader } from '@/components/layout/PageHeader';

interface Collection {
  id: string;
  name: string;
  createdAt: string;
  items: {
    id: string;
    product: {
      id: string;
      name: string;
      slug: string;
      price: number;
      images: string[];
      category: { name: string };
      _count: { reviews: number };
    };
  }[];
}

export default function CollectionsPage() {
  const router = useRouter();
  const { toasts, success, error: showError } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const refreshCollections = useCallback(async (signal?: AbortSignal) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/collections', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      setCollections(response.data.data);
      setIsError(false);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Gagal memuat koleksi:', err);
        setIsError(true);
      }
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    refreshCollections(controller.signal).finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [refreshCollections]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setIsCreating(true);

    const token = localStorage.getItem('accessToken');
    try {
      await api.post(
        '/api/collections',
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowCreateModal(false);
      setNewName('');
      refreshCollections();
      success('Koleksi berhasil dibuat');
    } catch (err) {
      console.error('Gagal membuat koleksi:', err);
      showError('Gagal membuat koleksi');
    } finally {
      setIsCreating(false);
    }
  }, [newName, refreshCollections, success, showError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm.id) return;

    const token = localStorage.getItem('accessToken');
    try {
      await api.delete(`/api/collections/${deleteConfirm.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshCollections();
      success('Koleksi berhasil dihapus');
    } catch (err) {
      console.error('Gagal menghapus:', err);
      showError('Gagal menghapus koleksi');
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  }, [deleteConfirm.id, refreshCollections, success, showError]);

  if (isLoading) return <LoadingPage />;
  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl font-medium text-espresso">Gagal Memuat Koleksi</h1>
        <p className="mt-2 text-warmgray">Terjadi kesalahan saat memuat data koleksi Anda</p>
        <Button className="mt-6" onClick={() => { setIsError(false); refreshCollections(); }}>Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        title="Hapus Koleksi"
        message="Yakin ingin menghapus koleksi ini? Semua produk di dalamnya akan dihapus dari koleksi."
        confirmLabel="Hapus"
        variant="danger"
      />

      <div className="mb-10 flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow="Tersimpan"
          title="Koleksiku"
          description="Kurasi pribadi parfum favorit Anda."
        />
        <Button onClick={() => setShowCreateModal(true)} className="shrink-0">
          + Koleksi Baru
        </Button>
      </div>

      {collections.length === 0 ? (
        <div className="py-20 text-center">
          <h2 className="font-serif text-2xl font-medium text-espresso">
            Belum Ada Koleksi
          </h2>
          <p className="mt-2 text-warmgray">
            Buat koleksi untuk menyimpan parfum favorit Anda.
          </p>
          <Button className="mt-6" onClick={() => setShowCreateModal(true)}>
            Buat Koleksi Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {collections.map((collection) => (
            <div key={collection.id}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-medium text-espresso">
                    {collection.name}
                  </h2>
                  <p className="text-sm text-warmgray">
                    {collection.items.length} produk
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/collections/${collection.id}`}>
                    <Button variant="outline" size="sm">
                      Lihat Semua
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm({ open: true, id: collection.id })}
                    className="text-red-500 hover:text-red-600"
                  >
                    Hapus
                  </Button>
                </div>
              </div>

              {collection.items.length === 0 ? (
                <Card className="p-8 text-center text-warmgray">
                  Belum ada produk di koleksi ini
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {collection.items.slice(0, 4).map((item) => (
                    <ProductCard key={item.id} product={item.product} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalHeader title="Buat Koleksi Baru" onClose={() => setShowCreateModal(false)} />
        <div className="space-y-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama koleksi..."
            className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-sm text-espresso placeholder:text-warmgray/60 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={isCreating}
              disabled={!newName.trim()}
            >
              Buat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
