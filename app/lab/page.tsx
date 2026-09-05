'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  LAB_WORKFLOW_EVENT_TYPE,
  type LabWorkflowEventType,
} from '@/lib/lab/lab-workflow';
import { formatDateSA } from '@/lib/sa-formatting';
import { LAB_WORKFLOW_STAGE, LAB_WORKFLOW_STAGES } from '@/lib/workflows/status-definitions';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';
import { PaginationFooter } from '@/components/pagination-footer';
import { describeRange, sliceForPage } from '@/lib/pagination';
import {
  LAB_BOARD_STAGES,
  NEXT_STAGE_ACTION,
  daysAtStage,
  describeDue,
  isClosed,
  isRecentlyClosed,
  matchesCaseSearch,
  nextLabStage,
  sortBoardCases,
} from '@/lib/lab/lab-board';
import { Search } from 'lucide-react';

type PatientOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type LabTimelineEntry = {
  id: string;
  label: string;
  description: string;
  event_at: string;
};

type LabCase = {
  id: string;
  case_number: string;
  patient_name: string;
  patient_id: string;
  case_type: string;
  description: string;
  status: string;
  workflow_stage: string;
  due_date: string;
  expected_return_date?: string | null;
  lab_name: string;
  shade?: string | null;
  slip_text?: string | null;
  slip_sent_at?: string | null;
  collected_at?: string | null;
  ready_for_collection_at?: string | null;
  collected_by_driver_at?: string | null;
  dropped_off_by_me_at?: string | null;
  patient_called_at?: string | null;
  patient_collected_at?: string | null;
  comeback_requested_at?: string | null;
  comeback_reason?: string | null;
  satisfaction_signed_at?: string | null;
  closed_at?: string | null;
  workflow_snapshot?: {
    current_stage: string;
    is_closed: boolean;
    requires_recall: boolean;
    can_close: boolean;
    timeline: LabTimelineEntry[];
  } | null;
  events?: Array<{
    id: string;
    lab_case_id: string;
    event_type: string;
    event_at: string;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
};

type WorkflowFormState = {
  event_type: LabWorkflowEventType | '';
  notes: string;
  workflow_stage: string;
  shade: string;
  lab_driver_name: string;
  worker_name: string;
  expected_return_date: string;
};

type NewCaseState = {
  patient_id: string;
  case_type: string;
  lab_name: string;
  due_date: string;
  expected_return_date: string;
  shade: string;
  slip_text: string;
  description: string;
  workflow_stage: string;
};

const EVENT_LABELS: Record<string, string> = {
  [LAB_WORKFLOW_EVENT_TYPE.NEW_PATIENT]: 'New patient',
  [LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_STUDIO]: 'Collected from Crown Dental Studio',
  [LAB_WORKFLOW_EVENT_TYPE.AT_LAB]: 'At Lab',
  [LAB_WORKFLOW_EVENT_TYPE.DELIVERED_TO_STUDIO]: 'Delivered to Crown Dental Studio',
};

// Short display names for board columns
const STAGE_SHORT: Record<string, string> = {
  [LAB_WORKFLOW_STAGE.NEW_PATIENT]: 'New Patient',
  [LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO]: 'Collected from Studio',
  [LAB_WORKFLOW_STAGE.AT_LAB]: 'At Lab',
  [LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO]: 'Delivered to Studio',
};

// Column accent: dot + count badge in the header, left border on cards, drop highlight
const COLUMN_STYLE: Record<string, { dot: string; badge: string; cardBorder: string; chip: string }> = {
  [LAB_WORKFLOW_STAGE.NEW_PATIENT]:            { dot: 'bg-navy-800',  badge: 'bg-navy-800 text-white',  cardBorder: 'border-l-navy-800',  chip: 'bg-navy-800 text-white' },
  [LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO]:  { dot: 'bg-teal',      badge: 'bg-teal text-white',      cardBorder: 'border-l-teal',      chip: 'bg-teal text-white' },
  [LAB_WORKFLOW_STAGE.AT_LAB]:                 { dot: 'bg-[#b8742e]', badge: 'bg-[#b8742e] text-white', cardBorder: 'border-l-[#b8742e]', chip: 'bg-[#b8742e] text-white' },
  [LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO]:    { dot: 'bg-emerald-600', badge: 'bg-emerald-600 text-white', cardBorder: 'border-l-emerald-600', chip: 'bg-emerald-600 text-white' },
};
const FALLBACK_STYLE = { dot: 'bg-slate-400', badge: 'bg-slate-500 text-white', cardBorder: 'border-l-slate-400', chip: 'bg-slate-500 text-white' };

const DUE_TONE_CLASS: Record<string, string> = {
  overdue: 'bg-red-50 text-red-600 border-red-200',
  today: 'bg-amber-50 text-amber-700 border-amber-200',
  soon: 'bg-amber-50 text-amber-700 border-amber-200',
  normal: 'bg-slate-50 text-slate-500 border-slate-200',
  none: 'bg-slate-50 text-slate-400 border-slate-200',
};

const DELIVERED_DAYS_ON_BOARD = 7;

// Map target stage → best event type for the API
const STAGE_TO_EVENT: Record<string, string> = {
  [LAB_WORKFLOW_STAGE.NEW_PATIENT]:           LAB_WORKFLOW_EVENT_TYPE.NEW_PATIENT,
  [LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO]: LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_STUDIO,
  [LAB_WORKFLOW_STAGE.AT_LAB]:                LAB_WORKFLOW_EVENT_TYPE.AT_LAB,
  [LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO]:   LAB_WORKFLOW_EVENT_TYPE.DELIVERED_TO_STUDIO,
};

function defaultNewCaseState(): NewCaseState {
  return {
    patient_id: '',
    case_type: '',
    lab_name: '',
    due_date: '',
    expected_return_date: '',
    shade: '',
    slip_text: '',
    description: '',
    workflow_stage: LAB_WORKFLOW_STAGE.NEW_PATIENT,
  };
}

function defaultWorkflowForm(): WorkflowFormState {
  return {
    event_type: LAB_WORKFLOW_EVENT_TYPE.NEW_PATIENT,
    notes: '',
    workflow_stage: LAB_WORKFLOW_STAGE.NEW_PATIENT,
    shade: '',
    lab_driver_name: '',
    worker_name: '',
    expected_return_date: '',
  };
}

function stageLabel(stage: string) {
  return STAGE_SHORT[stage] || stage || 'Unknown';
}

function LabContent() {
  const [labCases, setLabCases] = useState<LabCase[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCaseId, setSavingCaseId] = useState<string | null>(null);
  const [activeWorkflowCaseId, setActiveWorkflowCaseId] = useState<string | null>(null);
  const [workflowForm, setWorkflowForm] = useState<WorkflowFormState | null>(null);
  const [newCase, setNewCase] = useState<NewCaseState>(defaultNewCaseState());
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Drag-and-drop state
  const [dragCaseId, setDragCaseId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [boardSearch, setBoardSearch] = useState('');
  const [showAllDelivered, setShowAllDelivered] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const loadLabCases = async () => {
    const [labResponse, patientsResponse] = await Promise.all([
      fetch('/api/crm/lab-cases?limit=1000&page=1&includeEvents=1', { credentials: 'include' }),
      fetch('/api/crm/patients?limit=1000&page=1', { credentials: 'include' }),
    ]);

    const labPayload = await labResponse.json().catch(() => ({}));
    if (!labResponse.ok) throw new Error(labPayload.error || 'Failed to load lab cases');

    const patientsPayload = await patientsResponse.json().catch(() => ({}));
    if (!patientsResponse.ok) throw new Error(patientsPayload.error || 'Failed to load patients');

    setLabCases(labPayload.data || []);
    setPatients(patientsPayload.data || []);
  };

  useEffect(() => {
    setHistoryPage(1);
  }, [boardSearch]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadLabCases();
      } catch (err) {
        console.error('[lab] Error fetching lab cases:', err);
        setError(err instanceof Error ? err.message : 'Failed to load lab cases');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const refreshLabCases = async () => {
    const response = await fetch('/api/crm/lab-cases?limit=1000&page=1&includeEvents=1', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to load lab cases');
    setLabCases(payload.data || []);
  };

  const createLabCase = async () => {
    if (!newCase.patient_id || !newCase.case_type || !newCase.due_date) {
      setError('Patient, case type, and due date are required');
      return;
    }
    try {
      setSavingCaseId('new');
      const response = await fetch('/api/crm/lab-cases', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCase, status: 'Received' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to create lab case');
      setNewCase(defaultNewCaseState());
      setShowCreateForm(false);
      await refreshLabCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lab case');
    } finally {
      setSavingCaseId(null);
    }
  };

  const openWorkflowForm = (labCase: LabCase) => {
    setActiveWorkflowCaseId(labCase.id);
    setWorkflowForm({
      ...defaultWorkflowForm(),
      workflow_stage: labCase.workflow_stage || LAB_WORKFLOW_STAGE.NEW_PATIENT,
      shade: labCase.shade || '',
      expected_return_date: labCase.expected_return_date || '',
    });
    setError(null);
  };

  const closeWorkflowForm = () => {
    setActiveWorkflowCaseId(null);
    setWorkflowForm(null);
  };

  const updateWorkflowForm = (field: keyof WorkflowFormState, value: string | boolean) => {
    setWorkflowForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const submitWorkflowEvent = async (labCase: LabCase) => {
    if (!workflowForm || !workflowForm.event_type) {
      setError('Choose a workflow event');
      return;
    }
    try {
      setSavingCaseId(labCase.id);
      const response = await fetch(`/api/crm/lab-cases/${labCase.id}/events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: workflowForm.event_type,
          notes: workflowForm.notes,
          workflow_stage: workflowForm.workflow_stage,
          shade: workflowForm.shade,
          lab_driver_name: workflowForm.lab_driver_name,
          worker_name: workflowForm.worker_name,
          expected_return_date: workflowForm.expected_return_date,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to log workflow event');
      await refreshLabCases();
      closeWorkflowForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log workflow event');
    } finally {
      setSavingCaseId(null);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, caseId: string) => {
    setDragCaseId(caseId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', caseId);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the column entirely (not child elements)
    const related = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(related)) {
      setDragOverStage(null);
    }
  };

  /** Move a case to another column: optimistic update, then log the matching workflow event. */
  const moveCaseToStage = async (caseId: string, targetStage: string) => {
    const labCase = labCases.find((c) => c.id === caseId);
    if (!labCase || labCase.workflow_stage === targetStage) return;

    setLabCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, workflow_stage: targetStage } : c)),
    );

    const eventType = STAGE_TO_EVENT[targetStage] || LAB_WORKFLOW_EVENT_TYPE.NEW_PATIENT;

    try {
      setSavingCaseId(caseId);
      const response = await fetch(`/api/crm/lab-cases/${caseId}/events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          workflow_stage: targetStage,
          notes: `Moved to ${targetStage} via board`,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || 'Failed to move case');
      }
      // Always reload so the closed flag, timeline and stage come back from the server.
      await refreshLabCases();
    } catch {
      await refreshLabCases();
    } finally {
      setSavingCaseId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const caseId = e.dataTransfer.getData('text/plain') || dragCaseId;
    setDragCaseId(null);
    if (!caseId) return;
    await moveCaseToStage(caseId, targetStage);
  };

  const handleDragEnd = () => {
    setDragCaseId(null);
    setDragOverStage(null);
  };

  const openCases = labCases.filter((item) => item.workflow_snapshot?.is_closed !== true);
  const closedCases = labCases.filter((item) => item.workflow_snapshot?.is_closed === true);
  const recallCases = labCases.filter((item) => item.workflow_snapshot?.requires_recall);

  const columns = LAB_BOARD_STAGES;
  const now = new Date();
  const searchedCases = labCases.filter((item) => matchesCaseSearch(item, boardSearch));
  const olderDeliveredCount = searchedCases.filter(
    (item) => isClosed(item) && !isRecentlyClosed(item, now, DELIVERED_DAYS_ON_BOARD),
  ).length;

  const casesForColumn = (stage: string) => {
    const inStage = searchedCases.filter((item) => (item.workflow_stage || LAB_WORKFLOW_STAGE.NEW_PATIENT) === stage);
    const visible = stage === LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO && !showAllDelivered
      ? inStage.filter((item) => !isClosed(item) || isRecentlyClosed(item, now, DELIVERED_DAYS_ON_BOARD))
      : inStage;
    return sortBoardCases<LabCase>(visible, now);
  };

  const historyCases = sortBoardCases<LabCase>(searchedCases, now);
  const { pageCount: historyPageCount } = describeRange(historyPage, historyPageSize, historyCases.length);
  const currentHistoryPage = Math.min(historyPage, historyPageCount);
  const visibleHistory = sliceForPage<LabCase>(historyCases, currentHistoryPage, historyPageSize);
  const changeHistoryPageSize = (size: number) => {
    setHistoryPageSize(size);
    setHistoryPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lab Tracker</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Track cases from new patient, collection from Crown Dental Studio, at lab, to delivery back at the studio
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreateForm((v) => !v)}
              className="bg-navy-800 hover:bg-ink border-0 shadow-md text-xs"
            >
              {showCreateForm ? 'Hide Form' : '+ New Case'}
            </Button>
            <Button asChild variant="outline" className="text-xs border-slate-200">
              <Link href="/patients">Patients</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open Cases', value: openCases.length, gradient: 'from-navy-800 to-ink' },
          { label: 'At Lab', value: labCases.filter((item) => item.workflow_stage === LAB_WORKFLOW_STAGE.AT_LAB).length, gradient: 'from-[#3f4c7a] to-[#2c365c]' },
          { label: 'Recall Needed', value: recallCases.length, gradient: 'from-[#b8742e] to-[#8f5a22]' },
          { label: 'Delivered', value: closedCases.length, gradient: 'from-teal to-[#0b6f71]' },
        ].map((card) => (
          <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
            <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
            <p className="text-xs font-semibold opacity-75">{card.label}</p>
            <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        <OperationsRiskStrip variant="lab" />
      </div>

      {error && (
        <div className="max-w-7xl mx-auto rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Create case form (collapsible) */}
      {showCreateForm && (
        <div className="max-w-7xl mx-auto">
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <CardTitle className="text-base">Create Lab Case</CardTitle>
              <CardDescription className="text-xs">Add a case directly into the workflow</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
              <select
                value={newCase.patient_id}
                onChange={(e) => setNewCase({ ...newCase, patient_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
              <Input value={newCase.case_type} onChange={(e) => setNewCase({ ...newCase, case_type: e.target.value })} placeholder="Case type" className="rounded-xl border-slate-200" />
              <Input value={newCase.lab_name} onChange={(e) => setNewCase({ ...newCase, lab_name: e.target.value })} placeholder="Lab name" className="rounded-xl border-slate-200" />
              <Input type="date" value={newCase.due_date} onChange={(e) => setNewCase({ ...newCase, due_date: e.target.value })} className="rounded-xl border-slate-200" />
              <Input type="date" value={newCase.expected_return_date} onChange={(e) => setNewCase({ ...newCase, expected_return_date: e.target.value })} placeholder="Expected return" className="rounded-xl border-slate-200" />
              <Input value={newCase.shade} onChange={(e) => setNewCase({ ...newCase, shade: e.target.value })} placeholder="Shade (e.g. A2)" className="rounded-xl border-slate-200" />
              <select
                value={newCase.workflow_stage}
                onChange={(e) => setNewCase({ ...newCase, workflow_stage: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                {LAB_WORKFLOW_STAGES.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
              <Textarea value={newCase.slip_text} onChange={(e) => setNewCase({ ...newCase, slip_text: e.target.value })} placeholder="Slip notes" rows={2} className="md:col-span-2 lg:col-span-2 rounded-xl border-slate-200" />
              <Textarea value={newCase.description} onChange={(e) => setNewCase({ ...newCase, description: e.target.value })} placeholder="Case description" rows={2} className="md:col-span-2 lg:col-span-3 rounded-xl border-slate-200" />
              <div className="md:col-span-2 lg:col-span-3 flex flex-wrap gap-3">
                <Button onClick={createLabCase} className="bg-navy-800 hover:bg-ink border-0 shadow-md" disabled={savingCaseId === 'new'}>
                  {savingCaseId === 'new' ? 'Creating...' : 'Create Lab Case'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)} className="border-slate-200">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WORKFLOW BOARD */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">Loading lab workflow...</div>
        ) : (
          <>
            {/* Board toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Workflow board</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {openCases.length} open · {closedCases.length} delivered · drag a card or use its action button to move it
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={boardSearch}
                    onChange={(e) => setBoardSearch(e.target.value)}
                    placeholder="Search patient, case, lab, shade…"
                    className="pl-8 h-9 text-xs rounded-full bg-white border-slate-200"
                  />
                </div>
                <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setShowAllDelivered(false)}
                    className={`px-3 py-1 rounded-full transition-colors ${!showAllDelivered ? 'bg-ink text-white' : 'text-slate-500 hover:text-ink'}`}
                  >
                    Delivered: last {DELIVERED_DAYS_ON_BOARD} days
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllDelivered(true)}
                    className={`px-3 py-1 rounded-full transition-colors ${showAllDelivered ? 'bg-ink text-white' : 'text-slate-500 hover:text-ink'}`}
                  >
                    All
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory lg:snap-none">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }}>
                {columns.map((stage) => {
                  const style = COLUMN_STYLE[stage] || FALLBACK_STYLE;
                  const columnCases = casesForColumn(stage);
                  const overdueCount = columnCases.filter((item) => !isClosed(item) && describeDue(item.due_date, now).tone === 'overdue').length;
                  const isOver = dragOverStage === stage;
                  const isDeliveredColumn = stage === LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO;

                  return (
                    <div
                      key={stage}
                      className={`flex flex-col rounded-2xl border bg-white shadow-sm snap-start transition-colors ${isOver ? 'border-teal ring-2 ring-teal/20' : 'border-slate-200/80'}`}
                      onDragOver={(e) => handleDragOver(e, stage)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, stage)}
                    >
                      {/* Column header */}
                      <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                          <span className="text-xs font-bold text-ink truncate">{STAGE_SHORT[stage] || stage}</span>
                          {overdueCount > 0 && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full leading-none">
                              {overdueCount} overdue
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center ${style.badge}`}>
                          {columnCases.length}
                        </span>
                      </div>

                      {/* Drop zone body: scrolls inside the column so the page stays a fixed height */}
                      <div className={`flex-1 p-2 space-y-2 min-h-[160px] max-h-[65vh] overflow-y-auto rounded-b-2xl ${isOver ? 'bg-teal-soft' : 'bg-slate-50/70'}`}>
                        {columnCases.length === 0 && (
                          <div className={`flex items-center justify-center h-16 rounded-xl border-2 border-dashed text-xs font-medium ${isOver ? 'border-teal text-teal' : 'border-slate-200 text-slate-400'}`}>
                            {isOver ? 'Drop here' : boardSearch ? 'No matches' : 'Nothing here'}
                          </div>
                        )}
                        {columnCases.map((labCase) => {
                          const isDragging = dragCaseId === labCase.id;
                          const isSaving = savingCaseId === labCase.id;
                          const isExpanded = activeWorkflowCaseId === labCase.id;
                          const closed = isClosed(labCase);
                          const due = describeDue(labCase.due_date, now);
                          const stageDays = daysAtStage(labCase, now);
                          const currentStage = labCase.workflow_stage || LAB_WORKFLOW_STAGE.NEW_PATIENT;
                          const next = nextLabStage(currentStage);

                          return (
                            <div
                              key={labCase.id}
                              draggable={!isSaving}
                              onDragStart={(e) => handleDragStart(e, labCase.id)}
                              onDragEnd={handleDragEnd}
                              className={`rounded-xl border border-slate-200 bg-white shadow-sm select-none border-l-4 ${style.cardBorder} transition-all duration-150 ${
                                isDragging ? 'opacity-40 scale-95 cursor-grabbing' : 'cursor-grab hover:shadow-md'
                              } ${isSaving ? 'opacity-60 pointer-events-none' : ''}`}
                            >
                              <div className="p-3">
                                {/* Patient + case number */}
                                <div className="flex items-start justify-between gap-2">
                                  <Link href={`/patients/${labCase.patient_id}`} className="text-[13px] font-semibold text-ink leading-tight hover:text-teal truncate">
                                    {labCase.patient_name}
                                  </Link>
                                  <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">{labCase.case_number}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight truncate">
                                  {labCase.case_type}{labCase.lab_name ? ` · ${labCase.lab_name}` : ''}
                                </p>

                                {/* Chips */}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {closed ? (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                      Delivered {labCase.closed_at ? formatDateSA(labCase.closed_at) : ''}
                                    </span>
                                  ) : (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${DUE_TONE_CLASS[due.tone]}`}>
                                      {due.text}{labCase.due_date && due.tone !== 'today' ? ` · ${formatDateSA(labCase.due_date)}` : ''}
                                    </span>
                                  )}
                                  {labCase.shade && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                                      Shade {labCase.shade}
                                    </span>
                                  )}
                                  {!closed && stageDays != null && stageDays >= 1 && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                                      {stageDays}d here
                                    </span>
                                  )}
                                  {labCase.workflow_snapshot?.requires_recall && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                      Recall
                                    </span>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 mt-2.5">
                                  {next && !closed && (
                                    <button
                                      type="button"
                                      onClick={() => moveCaseToStage(labCase.id, next)}
                                      disabled={isSaving}
                                      className="flex-1 text-[11px] font-semibold text-white bg-navy-800 hover:bg-ink py-1.5 px-2 rounded-lg transition-colors disabled:opacity-60"
                                    >
                                      {isSaving ? 'Saving…' : `${NEXT_STAGE_ACTION[currentStage] || 'Next stage'} →`}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => isExpanded ? closeWorkflowForm() : openWorkflowForm(labCase)}
                                    disabled={isSaving}
                                    className={`text-[11px] font-medium py-1.5 px-2.5 rounded-lg border transition-colors ${next && !closed ? '' : 'flex-1'} ${
                                      isExpanded ? 'border-teal text-teal bg-teal-soft' : 'border-slate-200 text-slate-500 hover:text-teal hover:border-teal/40'
                                    }`}
                                  >
                                    {isExpanded ? 'Cancel' : 'Log event'}
                                  </button>
                                </div>
                              </div>

                              {/* Inline event form */}
                              {isExpanded && workflowForm && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-2">
                                  <select
                                    value={workflowForm.event_type}
                                    onChange={(e) => updateWorkflowForm('event_type', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal/30"
                                  >
                                    {Object.entries(EVENT_LABELS).map(([value, label]) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={workflowForm.workflow_stage}
                                    onChange={(e) => updateWorkflowForm('workflow_stage', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal/30"
                                  >
                                    {LAB_WORKFLOW_STAGES.map((s) => (
                                      <option key={s} value={s}>{STAGE_SHORT[s] || s}</option>
                                    ))}
                                  </select>
                                  <textarea
                                    value={workflowForm.notes}
                                    onChange={(e) => updateWorkflowForm('notes', e.target.value)}
                                    placeholder="Notes..."
                                    rows={2}
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-teal/30 resize-none"
                                  />
                                  <button
                                    onClick={() => submitWorkflowEvent(labCase)}
                                    disabled={isSaving}
                                    className="w-full rounded-lg bg-navy-800 text-white text-[11px] font-semibold py-1.5 hover:bg-ink transition-colors"
                                  >
                                    {isSaving ? 'Saving...' : 'Save event'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {isDeliveredColumn && !showAllDelivered && olderDeliveredCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAllDelivered(true)}
                            className="w-full text-[11px] font-medium text-slate-500 hover:text-teal py-2 rounded-xl border border-dashed border-slate-200 hover:border-teal/40 transition-colors"
                          >
                            Show {olderDeliveredCount} older delivered
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Case history */}
      <div className="max-w-7xl mx-auto">
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Case history</CardTitle>
            <CardDescription className="text-xs">
              {loading ? 'Loading...' : boardSearch ? `${historyCases.length} of ${labCases.length} cases match “${boardSearch.trim()}”` : `${labCases.length} total cases`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading lab cases...</div>
            ) : (
              <div className="space-y-3">
                {visibleHistory.length === 0 && (
                  <p className="text-center py-8 text-slate-500 text-sm">No cases found</p>
                )}
                {visibleHistory.map((labCase) => {
                  const isOpen = activeWorkflowCaseId === labCase.id;
                  const timeline = labCase.workflow_snapshot?.timeline || [];
                  const style = COLUMN_STYLE[labCase.workflow_stage] || COLUMN_STYLE[LAB_WORKFLOW_STAGE.NEW_PATIENT];

                  return (
                    <div key={labCase.id} className={`rounded-xl border bg-white p-4 hover:border-teal/30 transition-colors border-l-4 ${style.cardBorder}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style.chip}`}>
                              {stageLabel(labCase.workflow_stage || LAB_WORKFLOW_STAGE.NEW_PATIENT)}
                            </span>
                            {labCase.workflow_snapshot?.requires_recall && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Recall required</span>
                            )}
                            {labCase.workflow_snapshot?.is_closed && (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Closed</span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-900">
                            <Link href={`/patients/${labCase.patient_id}`} className="hover:text-teal hover:underline">{labCase.patient_name}</Link>
                          </p>
                          <p className="text-sm text-slate-600 mt-1">{labCase.case_number} · {labCase.case_type}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            Lab: {labCase.lab_name} · Due: {labCase.due_date ? formatDateSA(labCase.due_date) : '-'}
                            {labCase.expected_return_date ? ` · Expected: ${formatDateSA(labCase.expected_return_date)}` : ''}
                          </p>
                          {labCase.shade && <p className="text-sm text-slate-600 font-medium mt-1">Shade: {labCase.shade}</p>}
                          {labCase.description && <p className="text-sm text-slate-600 mt-1">{labCase.description}</p>}
                          {labCase.slip_text && <p className="text-xs text-slate-400 mt-1">Slip: {labCase.slip_text}</p>}
                          {timeline.length > 0 && (
                            <div className="mt-3 flex gap-2 flex-wrap">
                              {timeline.slice(-3).map((entry) => (
                                <span key={entry.id} className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                                  {formatDateSA(entry.event_at)} — {entry.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-2 lg:items-end">
                          <Button
                            onClick={() => isOpen ? closeWorkflowForm() : openWorkflowForm(labCase)}
                            variant={isOpen ? 'outline' : 'default'}
                            className={isOpen ? 'border-slate-200 text-xs' : 'bg-navy-800 hover:bg-ink border-0 shadow-sm text-xs'}
                            disabled={savingCaseId === labCase.id}
                          >
                            {savingCaseId === labCase.id ? 'Saving...' : isOpen ? 'Cancel' : 'Update workflow'}
                          </Button>
                        </div>
                      </div>
                      {isOpen && workflowForm && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Event</span>
                              <select value={workflowForm.event_type} onChange={(e) => updateWorkflowForm('event_type', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30">
                                {Object.entries(EVENT_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Workflow stage</span>
                              <select value={workflowForm.workflow_stage} onChange={(e) => updateWorkflowForm('workflow_stage', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30">
                                {LAB_WORKFLOW_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Shade</span>
                              <Input value={workflowForm.shade} onChange={(e) => updateWorkflowForm('shade', e.target.value)} placeholder="e.g. A2" className="rounded-xl border-slate-200" />
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expected return</span>
                              <Input type="date" value={workflowForm.expected_return_date} onChange={(e) => updateWorkflowForm('expected_return_date', e.target.value)} className="rounded-xl border-slate-200" />
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lab driver</span>
                              <Input value={workflowForm.lab_driver_name} onChange={(e) => updateWorkflowForm('lab_driver_name', e.target.value)} placeholder="Driver name" className="rounded-xl border-slate-200" />
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Worker / assistant</span>
                              <Input value={workflowForm.worker_name} onChange={(e) => updateWorkflowForm('worker_name', e.target.value)} placeholder="Worker name" className="rounded-xl border-slate-200" />
                            </label>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</span>
                              <Textarea value={workflowForm.notes} onChange={(e) => updateWorkflowForm('notes', e.target.value)} rows={3} className="rounded-xl border-slate-200" />
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button onClick={() => submitWorkflowEvent(labCase)} className="bg-navy-800 hover:bg-ink border-0 shadow-md" disabled={savingCaseId === labCase.id}>
                              {savingCaseId === labCase.id ? 'Saving...' : 'Save event'}
                            </Button>
                            <Button variant="outline" onClick={closeWorkflowForm} disabled={savingCaseId === labCase.id} className="border-slate-200">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && (
              <PaginationFooter
                page={currentHistoryPage}
                pageSize={historyPageSize}
                count={historyCases.length}
                onPageChange={setHistoryPage}
                onPageSizeChange={changeHistoryPageSize}
                noun="cases"
                className="-mx-6 -mb-6 mt-3"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LabPage() {
  return (
    <DashboardLayout>
      <LabContent />
    </DashboardLayout>
  );
}
