import { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import QuizClient from './QuizClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://oblintz.com';

const TITLE = 'Quiz Parfum — Temukan Aroma yang Tepat untuk Anda';
const DESCRIPTION =
  'Tidak yakin harus pilih parfum apa? Jawab beberapa pertanyaan singkat tentang acara, kepribadian, dan musim favorit Anda, lalu dapatkan rekomendasi parfum yang paling cocok dari OBLINTZ.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/quiz' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/quiz`,
    siteName: 'OBLINTZ',
    type: 'website',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Quiz Parfum', item: `${SITE_URL}/quiz` },
  ],
};

// FAQ structured data. Note: Google has limited FAQ *rich results* to
// authoritative sites, but the markup remains valid and helps search engines
// and AI assistants understand the page.
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Bagaimana cara kerja quiz parfum OBLINTZ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Anda menjawab beberapa pertanyaan singkat tentang acara, gaya kepribadian, musim, dan anggaran. Berdasarkan jawaban tersebut, kami merekomendasikan parfum dari koleksi kami yang paling sesuai dengan preferensi Anda.',
      },
    },
    {
      '@type': 'Question',
      name: 'Apakah quiz parfum ini gratis?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ya, quiz parfum OBLINTZ sepenuhnya gratis dan hanya membutuhkan waktu kurang dari satu menit untuk diselesaikan.',
      },
    },
    {
      '@type': 'Question',
      name: 'Apakah saya perlu membuat akun untuk mengikuti quiz?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Tidak. Anda dapat langsung mengikuti quiz tanpa membuat akun dan langsung melihat rekomendasi parfum yang cocok untuk Anda.',
      },
    },
  ],
};

export default function QuizPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <QuizClient />
    </>
  );
}
