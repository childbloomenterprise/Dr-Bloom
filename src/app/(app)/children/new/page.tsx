import { redirect } from 'next/navigation';

// Retired in the cross-app unification (Stage 3). Doctors no longer create
// siloed patient records; they connect to existing ChildBloom children via
// /patients (search + request access).
export default function NewChildPage() {
  redirect('/patients');
}
