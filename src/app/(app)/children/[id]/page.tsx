import { redirect } from 'next/navigation';

// Retired in the cross-app unification (Stage 3). The per-child clinical view is
// now /patients/[childId], backed by ChildBloom's unified data.
export default function ChildDetailPage() {
  redirect('/patients');
}
