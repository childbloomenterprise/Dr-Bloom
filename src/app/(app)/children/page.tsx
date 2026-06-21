import { redirect } from 'next/navigation';

// Retired in the cross-app unification (Stage 3). Doctors work with connected
// ChildBloom children via /patients; the standalone Gen-1 patient list (backed by
// the old per-app children/vitals/growth tables) is superseded.
export default function ChildrenPage() {
  redirect('/patients');
}
