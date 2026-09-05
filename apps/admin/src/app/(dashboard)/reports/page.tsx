'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, LineChart, Package, Warehouse, Users, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ReportFilters } from './components/ReportFilters';
import { RingkasanTab } from './components/RingkasanTab';
import { PenjualanTab } from './components/PenjualanTab';
import { ProdukTab } from './components/ProdukTab';
import { StokTab } from './components/StokTab';
import { PelangganTab } from './components/PelangganTab';
import { PembayaranTab } from './components/PembayaranTab';
import type {
  DashboardData,
  SalesData,
  FunnelData,
  ProductReportData,
  InventoryReportData,
  CustomerReportData,
  PaymentReportData,
  PromoReportData,
  Period,
} from './components/types';

type TabId = 'ringkasan' | 'penjualan' | 'produk' | 'stok' | 'pelanggan' | 'pembayaran';

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'penjualan', label: 'Penjualan', icon: LineChart },
  { id: 'produk', label: 'Produk', icon: Package },
  { id: 'stok', label: 'Stok', icon: Warehouse },
  { id: 'pelanggan', label: 'Pelanggan', icon: Users },
  { id: 'pembayaran', label: 'Pembayaran', icon: CreditCard },
];

function isoDay(offsetDays = 0): string {
  return new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');
  const [period, setPeriod] = useState<Period>('daily');
  const [startDate, setStartDate] = useState(() => isoDay(30));
  const [endDate, setEndDate] = useState(() => isoDay(0));

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sales, setSales] = useState<SalesData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [productReport, setProductReport] = useState<ProductReportData | null>(null);
  const [inventory, setInventory] = useState<InventoryReportData | null>(null);
  const [customers, setCustomers] = useState<CustomerReportData | null>(null);
  const [payments, setPayments] = useState<PaymentReportData | null>(null);
  const [promos, setPromos] = useState<PromoReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard KPI snapshot is a current-month figure; fetch it once.
  useEffect(() => {
    const controller = new AbortController();
    api
      .get('/api/reports/dashboard', { signal: controller.signal })
      .then((res) => setDashboard(res.data.data))
      .catch((err) => {
        if (err?.name !== 'AbortError') console.error('Gagal memuat ringkasan:', err);
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  // Sales + funnel react to the global date range / granularity.
  useEffect(() => {
    const controller = new AbortController();
    const range = `startDate=${encodeURIComponent(`${startDate}T00:00:00`)}&endDate=${encodeURIComponent(`${endDate}T23:59:59`)}`;

    Promise.all([
      api.get(`/api/reports/sales?period=${period}&${range}`, { signal: controller.signal }),
      api.get(`/api/reports/sales/status-funnel?${range}`, { signal: controller.signal }),
      api.get(`/api/reports/products?${range}`, { signal: controller.signal }),
      api.get(`/api/reports/inventory?${range}`, { signal: controller.signal }),
      api.get(`/api/reports/customers?${range}`, { signal: controller.signal }),
      api.get(`/api/reports/payments?${range}`, { signal: controller.signal }),
      api.get(`/api/reports/promos?${range}`, { signal: controller.signal }),
    ])
      .then(([salesRes, funnelRes, productsRes, inventoryRes, customersRes, paymentsRes, promosRes]) => {
        setSales(salesRes.data.data);
        setFunnel(funnelRes.data.data);
        setProductReport(productsRes.data.data);
        setInventory(inventoryRes.data.data);
        setCustomers(customersRes.data.data);
        setPayments(paymentsRes.data.data);
        setPromos(promosRes.data.data);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') console.error('Gagal memuat data laporan:', err);
      });

    return () => controller.abort();
  }, [period, startDate, endDate]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat laporan...</div>;
  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <ReportFilters
        period={period}
        startDate={startDate}
        endDate={endDate}
        onPeriodChange={setPeriod}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      {activeTab === 'ringkasan' && <RingkasanTab dashboard={dashboard} sales={sales} />}
      {activeTab === 'penjualan' && <PenjualanTab sales={sales} funnel={funnel} />}
      {activeTab === 'produk' && <ProdukTab data={productReport} />}
      {activeTab === 'stok' && <StokTab data={inventory} />}
      {activeTab === 'pelanggan' && <PelangganTab data={customers} />}
      {activeTab === 'pembayaran' && <PembayaranTab payment={payments} promo={promos} />}
    </div>
  );
}
