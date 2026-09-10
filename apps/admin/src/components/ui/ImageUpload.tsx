'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/utils';

interface ImageUploadProps {
  value: string | string[];
  onChange: (url: string | string[]) => void;
  multiple?: boolean;
  maxImages?: number;
  label?: string;
  error?: string;
  className?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
  value,
  onChange,
  multiple = false,
  maxImages = 10,
  label = 'Gambar',
  error,
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const images = multiple ? (Array.isArray(value) ? value : value ? [value] : []) : [];
  const hasValue = multiple ? images.length > 0 : !!value;
  const canAddMore = multiple ? images.length < maxImages : true;

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

        if (multiple) {
          const currentImages = Array.isArray(value) ? value : value ? [value] : [];
          onChange([...currentImages, url]);
        } else {
          onChange(url);
        }
      } catch (err) {
        setUploadError('Gagal mengupload gambar. Silakan coba lagi.');
      } finally {
        setIsUploading(false);
      }
    },
    [multiple, value, onChange]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      if (multiple) {
        Array.from(files).forEach((file) => uploadFile(file));
      } else {
        const file = files[0];
        if (file) uploadFile(file);
      }

      if (inputRef.current) inputRef.current.value = '';
    },
    [multiple, uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (multiple) {
        Array.from(e.dataTransfer.files).forEach((file) => uploadFile(file));
      } else {
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
      }
    },
    [multiple, uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemoveSingle = useCallback(() => {
    onChange('');
    setUploadError(null);
  }, [onChange]);

  const handleRemoveAt = useCallback(
    (index: number) => {
      if (!Array.isArray(value)) return;
      const newImages = value.filter((_, i) => i !== index);
      onChange(newImages);
      setUploadError(null);
    },
    [value, onChange]
  );

  const displayError = uploadError || error;

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>

      {multiple ? (
        <div className="space-y-3">
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img, index) => (
                <div key={img} className="relative">
                  <Image
                    src={resolveMediaUrl(img) as string}
                    alt={`Gambar ${index + 1}`}
                    width={200}
                    height={150}
                    className="h-32 w-full rounded-lg border border-slate-200 object-cover"
                    unoptimized
                  />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-primary-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveAt(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {canAddMore && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              className={`flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
              }`}
            >
              {isUploading ? (
                <div className="text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-primary-500" />
                  <p className="mt-1 text-xs text-slate-500">Mengupload...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    <span className="font-medium text-primary-600">Klik</span> atau seret gambar
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400">
            {images.length}/{maxImages} gambar terupload
          </p>
        </div>
      ) : (
        <>
          {hasValue ? (
            <div className="relative inline-block">
              <Image
                src={resolveMediaUrl(value as string) as string}
                alt="Preview"
                width={200}
                height={100}
                className="h-28 w-48 rounded-lg border border-slate-200 object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={handleRemoveSingle}
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
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      {displayError && <p className="mt-1 text-xs text-red-500">{displayError}</p>}
    </div>
  );
}
