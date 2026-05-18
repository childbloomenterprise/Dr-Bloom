'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { theme as T } from '@/lib/theme';
import { ageFromDob } from '@/lib/age';
import {
  Stack, HRow, Card, Button, Input, Body, Eyebrow, Display,
  Avatar, Chip, Divider, Spacer,
} from '@/components/primitives';
import { Icon } from '@/components/Icon';
import { TopBar } from '@/components/shell/TopBar';
import type { Child, DoctorChildConnection, UserProfile, PatientSearchResult } from '@/types/database';

interface PatientEntry {
  connection: DoctorChildConnection;
  child: Child;
  parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null;
}

interface Props {
  connectedPatients: PatientEntry[];
  pendingConnections: { id: string; child_id: string; created_at: string }[];
  doctorId: string;
}

type ModalState =
  | { type: 'none' }
  | { type: 'request'; child: Child }
  | { type: 'invite' };

export function PatientsClient({ connectedPatients, pendingConnections, doctorId }: Props) {
  const router = useRouter();
  const [isMobile, setIsMobile] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [modal, setModal] = React.useState<ModalState>({ type: 'none' });

  // Request access form
  const [requestMsg, setRequestMsg] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteChildName, setInviteChildName] = React.useState('');
  const [inviteChildDob, setInviteChildDob] = React.useState('');

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (query.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setSearchResults(json.results ?? []);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 380);
    return () => clearTimeout(t);
  }, [query]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function sendConnectionRequest() {
    if (modal.type !== 'request') return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/patients/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: modal.child.id, message: requestMsg }),
      });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error ?? 'Request failed');
      } else {
        setModal({ type: 'none' });
        setRequestMsg('');
        showToast('Request sent to parent');
        router.refresh();
      }
    } catch { showToast('Network error'); }
    setSubmitting(false);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/patients/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: inviteEmail,
          childName: inviteChildName,
          childDob: inviteChildDob || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error ?? 'Invite failed');
      } else {
        setModal({ type: 'none' });
        setInviteEmail(''); setInviteChildName(''); setInviteChildDob('');
        showToast(`Invite sent to ${inviteEmail}`);
      }
    } catch { showToast('Network error'); }
    setSubmitting(false);
  }

  const hasSearch = query.length >= 2;

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as Window & { __drBloomOpenDrawer?: () => void }).__drBloomOpenDrawer?.()}
        eyebrow="PATIENTS"
        title={<>Your <span style={{ fontStyle: 'italic' }}>patients.</span></>}
        subtitle={`${connectedPatients.length} connected · ${pendingConnections.length} pending`}
      />

      <div style={{ padding: isMobile ? '16px 14px 40px' : '24px 32px 48px' }}>

        {/* Search bar */}
        <Card p={isMobile ? 16 : 22} style={{ marginBottom: 20 }}>
          <Eyebrow color={T.brand} style={{ marginBottom: 12 }}>Find a patient</Eyebrow>
          <div style={{ position: 'relative' }}>
            <Input
              placeholder="Search by name or date of birth (YYYY-MM-DD)…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: 44 }}
            />
            <Icon
              name="search" size={17} stroke={1.6} color={T.ink400}
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

          {/* Search results */}
          {hasSearch && (
            <div style={{ marginTop: 12 }}>
              {searching ? (
                <Body size={13} color={T.ink400}>Searching…</Body>
              ) : searchResults.length === 0 ? (
                <Stack gap={10}>
                  <Body size={13} color={T.ink500}>No child found for &ldquo;{query}&rdquo;.</Body>
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => setModal({ type: 'invite' })}
                    icon="plus"
                  >
                    Invite parent to ChildBloom
                  </Button>
                </Stack>
              ) : (
                <Stack gap={8}>
                  {searchResults.map(({ child, connectionStatus, connectionId }) => (
                    <SearchResultRow
                      key={child.id}
                      child={child}
                      connectionStatus={connectionStatus}
                      onRequest={() => setModal({ type: 'request', child })}
                    />
                  ))}
                </Stack>
              )}
            </div>
          )}
        </Card>

        {/* Pending connections notice */}
        {pendingConnections.length > 0 && (
          <div style={{
            marginBottom: 16, padding: '12px 18px', borderRadius: T.radius.md,
            background: T.brandWash, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Icon name="clock" size={16} color={T.brand} />
            <Body size={13} color={T.brand} weight={500}>
              {pendingConnections.length} connection request{pendingConnections.length > 1 ? 's' : ''} awaiting parent approval
            </Body>
          </div>
        )}

        {/* Connected patients list */}
        <Card p={0}>
          <div style={{ padding: '18px 22px 12px', borderBottom: `1px solid ${T.line}` }}>
            <HRow gap={12} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack gap={2}>
                <Eyebrow color={T.ink400}>Connected patients</Eyebrow>
                <Display size={20} italic weight={400}>
                  {connectedPatients.length === 0 ? 'No patients yet.' : `${connectedPatients.length} patient${connectedPatients.length > 1 ? 's' : ''}.`}
                </Display>
              </Stack>
            </HRow>
          </div>

          {connectedPatients.length === 0 ? (
            <div style={{ padding: '32px 22px', textAlign: 'center' }}>
              <Body size={13} color={T.ink500}>Search above to find and connect with patients.</Body>
            </div>
          ) : (
            connectedPatients.map(({ child, parent }, i) => (
              <Link key={child.id} href={`/patients/${child.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '14px 22px',
                    borderBottom: i < connectedPatients.length - 1 ? `1px solid ${T.line}` : 'none',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.surfaceDim)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {child.photo_url ? (
                    <img
                      src={child.photo_url} alt={child.first_name}
                      style={{ width: 44, height: 44, borderRadius: T.radius.pill, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <Avatar name={`${child.first_name} ${child.last_name ?? ''}`} size={44} tone="wash" />
                  )}
                  <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                    <Body size={14} weight={600} color={T.ink900}>
                      {child.first_name} {child.last_name ?? ''}
                    </Body>
                    <HRow gap={8}>
                      <Mono size={11}>{ageFromDob(child.date_of_birth)}</Mono>
                      {child.gender && <Mono size={11}>· {child.gender}</Mono>}
                      {parent && <Mono size={11} color={T.ink400}>· {parent.full_name}</Mono>}
                    </HRow>
                  </Stack>
                  <Chip tone="wash" icon="check">Connected</Chip>
                  <Icon name="chevron" size={14} stroke={1.6} color={T.ink300} style={{ marginLeft: 4 }} />
                </div>
              </Link>
            ))
          )}
        </Card>
      </div>

      {/* Request Access modal */}
      {modal.type === 'request' && (
        <Modal onClose={() => setModal({ type: 'none' })}>
          <Eyebrow color={T.brand} style={{ marginBottom: 8 }}>Request access</Eyebrow>
          <Display size={20} italic weight={400} style={{ marginBottom: 4 }}>
            {modal.child.first_name} {modal.child.last_name ?? ''}
          </Display>
          <Body size={13} color={T.ink500} style={{ marginBottom: 20 }}>
            The parent will receive a notification to approve your request.
          </Body>
          <Input
            label="Optional message to parent"
            placeholder="e.g. Hi, I'm Dr. Mensah and would like to review your child's records before the appointment."
            value={requestMsg}
            onChange={e => setRequestMsg(e.target.value)}
          />
          <Spacer h={16} />
          <HRow gap={10}>
            <Button variant="secondary" onClick={() => setModal({ type: 'none' })}>Cancel</Button>
            <Button onClick={sendConnectionRequest} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send request'}
            </Button>
          </HRow>
        </Modal>
      )}

      {/* Invite parent modal */}
      {modal.type === 'invite' && (
        <Modal onClose={() => setModal({ type: 'none' })}>
          <Eyebrow color={T.brand} style={{ marginBottom: 8 }}>Invite parent to ChildBloom</Eyebrow>
          <Display size={20} italic weight={400} style={{ marginBottom: 16 }}>
            Not on ChildBloom yet?
          </Display>
          <form onSubmit={sendInvite}>
            <Stack gap={12}>
              <Input
                label="Parent's email"
                type="email"
                placeholder="parent@email.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
              />
              <Input
                label="Child's name"
                placeholder="First name"
                value={inviteChildName}
                onChange={e => setInviteChildName(e.target.value)}
              />
              <Input
                label="Approximate date of birth"
                type="date"
                value={inviteChildDob}
                onChange={e => setInviteChildDob(e.target.value)}
              />
              <Spacer h={4} />
              <HRow gap={10}>
                <Button type="button" variant="secondary" onClick={() => setModal({ type: 'none' })}>Cancel</Button>
                <Button type="submit" disabled={submitting || !inviteEmail}>
                  {submitting ? 'Sending…' : 'Send invite'}
                </Button>
              </HRow>
            </Stack>
          </form>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: T.ink900, color: '#fff', padding: '12px 22px',
          borderRadius: T.radius.pill, fontFamily: T.sans, fontSize: 13.5, fontWeight: 500,
          boxShadow: T.shadow.lg, zIndex: 200, pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Mono({ children, size = 11, color, style }: { children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: size, color: color || T.ink400, letterSpacing: '0.04em', ...style }}>
      {children}
    </span>
  );
}

function SearchResultRow({
  child, connectionStatus, onRequest,
}: {
  child: Child;
  connectionStatus: string;
  onRequest: () => void;
}) {
  const statusBadge = connectionStatus === 'active'
    ? <Chip tone="wash" icon="check">Connected</Chip>
    : connectionStatus === 'pending'
      ? <Chip tone="soft">Request pending</Chip>
      : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
      borderRadius: T.radius.md, background: T.surfaceDim,
    }}>
      <Avatar name={`${child.first_name} ${child.last_name ?? ''}`} size={38} tone="wash" />
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Body size={13.5} weight={600} color={T.ink900}>
          {child.first_name} {child.last_name ?? ''}
        </Body>
        <Mono size={11}>{ageFromDob(child.date_of_birth)}</Mono>
      </Stack>
      {statusBadge ?? (
        <button
          onClick={onRequest}
          style={{
            height: 34, padding: '0 14px', borderRadius: T.radius.pill,
            background: T.brand, color: '#fff', border: 'none',
            fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Request access
        </button>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(11,23,20,0.45)',
          backdropFilter: 'blur(2px)', zIndex: 100,
        }}
      />
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(480px, 92vw)',
        background: T.surface, borderRadius: T.radius.xl,
        padding: 28, boxShadow: T.shadow.lg, zIndex: 101,
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 34, height: 34, borderRadius: T.radius.pill,
            background: T.surfaceDim, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.ink700, cursor: 'pointer',
          }}
        >
          <Icon name="close" size={16} stroke={1.7} />
        </button>
        {children}
      </div>
    </>
  );
}
