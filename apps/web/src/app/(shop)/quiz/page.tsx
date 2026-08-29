'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LoadingPage } from '@/components/ui/Loading';
import { ProductCard } from '@/components/product/ProductCard';

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
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Gagal memuat opsi quiz:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();

    return () => controller.abort();
  }, []);

  const handleSelect = (key: keyof QuizAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/api/quiz/submit', answers);
      setRecommendations(response.data.data.recommendations);
    } catch (error) {
      console.error('Gagal submit quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingPage />;

  // Hasil rekomendasi
  if (recommendations.length > 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 text-center">
          <span className="text-6xl">✨</span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Rekomendasi untuk Kamu
          </h1>
          <p className="mt-2 text-gray-600">
            Berdasarkan jawabanmu, kami merekomendasikan parfum ini:
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {recommendations.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => {
              setRecommendations([]);
              setCurrentStep(0);
              setAnswers({ occasion: '', personality: '', season: '', budget: '' });
            }}
          >
            Mulai Ulang Quiz
          </Button>
        </div>
      </div>
    );
  }

  // Quiz steps
  const step = STEPS[currentStep];
  const currentOptions = options?.[step.key as keyof QuizOptions] || [];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Langkah {currentStep + 1} dari {STEPS.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{step.title}</CardTitle>
          <p className="text-gray-500">{step.subtitle}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {currentOptions.map((option) => {
              const isSelected = answers[step.key as keyof QuizAnswers] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(step.key as keyof QuizAnswers, option.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-3xl">{option.icon}</span>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? 'text-primary-600' : 'text-gray-700'
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
          disabled={!answers[step.key as keyof QuizAnswers] || isSubmitting}
          isLoading={isSubmitting}
        >
          {currentStep === STEPS.length - 1 ? 'Lihat Hasil' : 'Selanjutnya'}
        </Button>
      </div>
    </div>
  );
}
