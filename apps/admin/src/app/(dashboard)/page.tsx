import { redirect } from 'next/navigation';

// The admin root points at the dashboard, which lives at /dashboard so it lines
// up with the sidebar nav and header title map.
export default function AdminRootPage() {
  redirect('/dashboard');
}
