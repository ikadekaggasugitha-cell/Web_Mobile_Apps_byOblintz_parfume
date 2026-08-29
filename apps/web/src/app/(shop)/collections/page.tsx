'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LoadingPage } from '@/components/ui/Loading';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProductCard } from '@/components/product/ProductCard';

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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const refreshCollections = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/collections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCollections(response.data.data);
    } catch (error) {
      console.error('Gagal memuat koleksi:', error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await api.get('/api/collections', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        setCollections(response.data.data);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Gagal memuat koleksi:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, []);

  const handleCreate = async () => {
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
    } catch (error) {
      console.error('Gagal membuat koleksi:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus koleksi ini?')) return;

    const token = localStorage.getItem('accessToken');
    try {
      await api.delete(`/api/collections/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshCollections();
    } catch (error) {
      console.error('Gagal menghapus:', error);
    }
  };

  if (isLoading) return <LoadingPage />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Koleksiku</h1>
          <p className="mt-1 text-gray-500">
            Koleksi parfum favoritmu
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Koleksi Baru
        </Button>
      </div>

      {collections.length === 0 ? (
        <div className="py-16 text-center">
          <span className="text-6xl">📁</span>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Belum Ada Koleksi
          </h2>
          <p className="mt-2 text-gray-500">
            Buat koleksi untuk menyimpan parfum favoritmu
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
                  <h2 className="text-xl font-semibold text-gray-900">
                    {collection.name}
                  </h2>
                  <p className="text-sm text-gray-500">
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
                    onClick={() => handleDelete(collection.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    Hapus
                  </Button>
                </div>
              </div>

              {collection.items.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
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
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
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
