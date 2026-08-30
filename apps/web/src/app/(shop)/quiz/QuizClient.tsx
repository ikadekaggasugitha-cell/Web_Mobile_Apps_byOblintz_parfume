'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LoadingPage } from '@/components/ui/Loading';
import { ProductCard } from '@/components/product/ProductCard';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface QuizOptions {
  occasion: { value: string; label: string; icon: string }[];
  personality: { value: string; label: string; icon: string }[];
  season: { value: string; label: string; icon: string }[];
  budget: { value: string; label: string; icon: string }[];
}

interface QuizAnswers {
  occasion: string;
  personality: string;
  season: string;
  budget: string;
}

const STEPS = [
  { key: 'occasion', title: 'Untuk Acara Apa?', subtitle: 'Pilih occasion yang paling cocok' },
  { key: 'personality', title: 'Gaya Mana yang Kamu Suka?', subtitle: 'Pilih karakter parfum favoritmu' },
  { key: 'season', title: 'Untuk Musim Apa?', subtitle: 'Cuaca mempengaruhi aroma parfum' },
  { key: 'budget', title: 'Budget Berapa?', subtitle: 'Pilih range harga yang sesuai' },
];

export default function QuizPage() {
  const router = useRouter();
  const { toasts, error: showError } = useToast();
  const [options, setOptions] = useState<QuizOptions | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    occasion: '',
    personality: '',
    season: '',
    budget: '',
  });
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchOptions = async () => {
      try {
        const response = await api.get('/api/quiz/options', {
          signal: controller.signal,
        });
        setOptions(response.data.data);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Gagal memuat opsi quiz:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();

    return () => controller.abort();
  }, []);

  const handleSelect = useCallback((key: keyof QuizAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/api/quiz/submit', answers);
      setRecommendations(response.data.data.recommendations);
    } catch (err) {
      console.error('Gagal submit quiz:', err);
      showError('Gagal memuat rekomendasi');
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, showError]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }, [currentStep, handleSubmit]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setRecommendations([]);
    setCurrentStep(0);
    setAnswers({ occasion: '', personality: '', season: '', budget: '' });
  }, []);

  const step = useMemo(() => STEPS[currentStep], [currentStep]);
  const currentOptions = useMemo(
    () => options?.[step.key as keyof QuizOptions] || [],
    [options, step.key]
  );
  const progress = useMemo(
    () => ((currentStep + 1) / STEPS.length) * 100,
    [currentStep]
  );
  const isStepValid = useMemo(
    () => !!answers[step.key as keyof QuizAnswers],
    [answers, step.key]
  );

  if (isLoading) return <LoadingPage />;

  if (recommendations.length > 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs uppercase tracking-luxe text-gold-600">
            <span aria-hidden="true" className="mr-2.5">—</span>
            Hasil Quiz
            <span aria-hidden="true" className="ml-2.5">—</span>
          </p>
          <h1 className="mt-4 font-serif text-4xl font-medium tracking-[-0.01em] text-espresso sm:text-5xl">
            Aroma untuk Anda
          </h1>
          <p className="mt-4 text-base leading-relaxed text-warmgray">
            Berdasarkan jawaban Anda, kami memilihkan parfum berikut.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {recommendations.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline" onClick={handleReset}>
            Mulai Ulang Quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <ToastContainer toasts={toasts} />

      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-luxe text-gold-600">
          <span aria-hidden="true" className="mr-2.5">—</span>
          Fragrance Quiz
          <span aria-hidden="true" className="ml-2.5">—</span>
        </p>
        <h1 className="mt-4 font-serif text-3xl font-medium tracking-[-0.01em] text-espresso sm:text-4xl">
          Temukan Aroma Anda
        </h1>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs uppercase tracking-luxe text-warmgray">
          <span>
            Langkah {currentStep + 1} dari {STEPS.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{step.title}</CardTitle>
          <p className="text-warmgray">{step.subtitle}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {currentOptions.map((option) => {
              const isSelected = answers[step.key as keyof QuizAnswers] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(step.key as keyof QuizAnswers, option.value)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-5 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                      : 'border-line hover:border-gold-300 hover:bg-sand'
                  }`}
                >
                  <span className="text-3xl">{option.icon}</span>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? 'text-primary-700' : 'text-espresso'
                    }`}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Kembali
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isStepValid || isSubmitting}
          isLoading={isSubmitting}
        >
          {currentStep === STEPS.length - 1 ? 'Lihat Hasil' : 'Selanjutnya'}
        </Button>
      </div>
    </div>
  );
}
