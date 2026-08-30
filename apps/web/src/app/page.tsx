import { Hero } from '@/components/home/Hero';
import { FeaturedCollections } from '@/components/home/FeaturedCollections';
import { StatsBar } from '@/components/home/StatsBar';
import { ValueProps } from '@/components/home/ValueProps';
import { Bestsellers } from '@/components/home/Bestsellers';
import { BrandStory } from '@/components/home/BrandStory';
import { Testimonials } from '@/components/home/Testimonials';
import { QuizCta } from '@/components/home/QuizCta';
import { Newsletter } from '@/components/home/Newsletter';
import { JsonLd } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://oblintz.com';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'OBLINTZ',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'Toko parfum original premium — koleksi parfum pria, wanita, dan unisex pilihan.',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'OBLINTZ',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <Hero />
      <FeaturedCollections />
      <StatsBar />
      <ValueProps />
      <Bestsellers />
      <BrandStory />
      <Testimonials />
      <QuizCta />
      <Newsletter />
    </>
  );
}
