'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
  value,
  onChange,
  label = 'Gambar',
  error,
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError('Format file tidak didukung. Gunakan: JPG, PNG, GIF, atau WebP');
        return;
      }

      if (file.size > MAX_SIZE) {
        setUploadError('Ukuran file maksimal 5MB');
        return;
      }

      setUploadError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/api/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const { url } = response.data.data;
        onChange(url);
      } catch (err) {
        setUploadError('Gagal mengupload gambar. Silakan coba lagi.');
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemove = useCallback(() => {
    onChange('');
    setUploadError(null);
  }, [onChange]);

  const displayError = uploadError || error;

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>

      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt="Preview"
            width={200}
            height={100}
            className="h-28 w-48 rounded-lg border border-slate-200 object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
          }`}
        >
          {isUploading ? (
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-primary-500" />
              <p className="mt-2 text-sm text-slate-500">Mengupload...</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-400">
                <ImageIcon className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-primary-600">Klik untuk upload</span> atau seret gambar
              </p>
              <p className="mt-1 text-xs text-slate-400">JPG, PNG, GIF, WebP (maks. 5MB)</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {displayError && <p className="mt-1 text-xs text-red-500">{displayError}</p>}
    </div>
  );
}
