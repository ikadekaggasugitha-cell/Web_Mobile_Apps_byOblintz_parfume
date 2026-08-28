export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
          <p className="mt-2 text-3xl font-bold">1,234</p>
          <p className="mt-1 text-sm text-green-600">+12% dari bulan lalu</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
          <p className="mt-2 text-3xl font-bold">Rp 45.678.000</p>
          <p className="mt-1 text-sm text-green-600">+8% dari bulan lalu</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">New Customers</h3>
          <p className="mt-2 text-3xl font-bold">567</p>
          <p className="mt-1 text-sm text-green-600">+5% dari bulan lalu</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Products</h3>
          <p className="mt-2 text-3xl font-bold">89</p>
          <p className="mt-1 text-sm text-gray-500">12 stok rendah</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Pesanan Terbaru</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="pb-3">Order ID</th>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3">#ORD-001</td>
              <td className="py-3">John Doe</td>
              <td className="py-3">Rp 1.250.000</td>
              <td className="py-3">
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                  Completed
                </span>
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-3">#ORD-002</td>
              <td className="py-3">Jane Smith</td>
              <td className="py-3">Rp 850.000</td>
              <td className="py-3">
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                  Processing
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
