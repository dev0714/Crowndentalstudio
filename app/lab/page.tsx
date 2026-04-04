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
  comeback_reason: string;
  patient_happy: boolean;
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
  [LAB_WORKFLOW_EVENT_TYPE.SLIP_EMAILED]: 'Slip emailed',
  [LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_PATIENT]: 'Collected from patient',
  [LAB_WORKFLOW_EVENT_TYPE.SENT_TO_LAB]: 'Sent to lab',
  [LAB_WORKFLOW_EVENT_TYPE.RECEIVED_BY_LAB]: 'Received by lab',
  [LAB_WORKFLOW_EVENT_TYPE.IN_PRODUCTION]: 'In production',
  [LAB_WORKFLOW_EVENT_TYPE.READY_FOR_COLLECTION]: 'Ready for collection',
  [LAB_WORKFLOW_EVENT_TYPE.COLLECTED_BY_DRIVER]: 'Collected by driver',
  [LAB_WORKFLOW_EVENT_TYPE.DROPPED_OFF_BY_ME]: 'Dropped off by me',
  [LAB_WORKFLOW_EVENT_TYPE.PATIENT_CALLED]: 'Patient called',
  [LAB_WORKFLOW_EVENT_TYPE.PATIENT_COLLECTED]: 'Patient collected',
  [LAB_WORKFLOW_EVENT_TYPE.COMEBACK_REQUESTED]: 'Comeback requested',
  [LAB_WORKFLOW_EVENT_TYPE.RETURNED_FOR_ADJUSTMENT]: 'Returned for adjustment',
  [LAB_WORKFLOW_EVENT_TYPE.SATISFACTION_SIGNED]: 'Satisfaction signed',
  [LAB_WORKFLOW_EVENT_TYPE.CASE_CLOSED]: 'Case closed',
};

// Short display names for board columns
const STAGE_SHORT: Record<string, string> = {
  [LAB_WORKFLOW_STAGE.CREATED]: 'New',
  [LAB_WORKFLOW_STAGE.COLLECTED]: 'Collected',
  [LAB_WORKFLOW_STAGE.RECEIVED_BY_LAB]: 'At Lab',
  [LAB_WORKFLOW_STAGE.IN_PRODUCTION]: 'In Prod',
  [LAB_WORKFLOW_STAGE.READY]: 'Ready',
  [LAB_WORKFLOW_STAGE.DISPATCHED]: 'Dispatched',
  [LAB_WORKFLOW_STAGE.RECEIVED_BY_PRACTICE]: 'Received',
  [LAB_WORKFLOW_STAGE.FITTED_TO_PATIENT]: 'Fitted',
  [LAB_WORKFLOW_STAGE.RETURNED_FOR_ADJUSTMENT]: 'Adjustment',
  [LAB_WORKFLOW_STAGE.REMAKE]: 'Remake',
  [LAB_WORKFLOW_STAGE.COMPLETED]: 'Done',
};

// Column header gradient + text color
const COLUMN_STYLE: Record<string, { header: string; badge: string; cardBorder: string; dot: string }> = {
  [LAB_WORKFLOW_STAGE.CREATED]:               { header: 'bg-gradient-to-r from-blue-600 to-blue-500',      badge: 'bg-blue-400/40 text-white',       cardBorder: 'border-l-blue-400',    dot: 'bg-blue-400' },
  [LAB_WORKFLOW_STAGE.COLLECTED]:             { header: 'bg-gradient-to-r from-cyan-600 to-cyan-500',       badge: 'bg-cyan-400/40 text-white',        cardBorder: 'border-l-cyan-400',    dot: 'bg-cyan-400' },
  [LAB_WORKFLOW_STAGE.RECEIVED_BY_LAB]:       { header: 'bg-gradient-to-r from-indigo-600 to-indigo-500',   badge: 'bg-indigo-400/40 text-white',      cardBorder: 'border-l-indigo-400',  dot: 'bg-indigo-400' },
  [LAB_WORKFLOW_STAGE.IN_PRODUCTION]:         { header: 'bg-gradient-to-r from-violet-600 to-violet-500',   badge: 'bg-violet-400/40 text-white',      cardBorder: 'border-l-violet-400',  dot: 'bg-violet-400' },
  [LAB_WORKFLOW_STAGE.READY]:                 { header: 'bg-gradient-to-r from-emerald-600 to-emerald-500', badge: 'bg-emerald-400/40 text-white',     cardBorder: 'border-l-emerald-400', dot: 'bg-emerald-400' },
  [LAB_WORKFLOW_STAGE.DISPATCHED]:            { header: 'bg-gradient-to-r from-purple-600 to-purple-500',   badge: 'bg-purple-400/40 text-white',      cardBorder: 'border-l-purple-400',  dot: 'bg-purple-400' },
  [LAB_WORKFLOW_STAGE.RECEIVED_BY_PRACTICE]:  { header: 'bg-gradient-to-r from-teal-600 to-teal-500',       badge: 'bg-teal-400/40 text-white',        cardBorder: 'border-l-teal-400',    dot: 'bg-teal-400' },
  [LAB_WORKFLOW_STAGE.FITTED_TO_PATIENT]:     { header: 'bg-gradient-to-r from-green-600 to-green-500',     badge: 'bg-green-400/40 text-white',       cardBorder: 'border-l-green-400',   dot: 'bg-green-400' },
  [LAB_WORKFLOW_STAGE.RETURNED_FOR_ADJUSTMENT]:{ header: 'bg-gradient-to-r from-orange-600 to-orange-500',  badge: 'bg-orange-400/40 text-white',      cardBorder: 'border-l-orange-400',  dot: 'bg-orange-400' },
  [LAB_WORKFLOW_STAGE.REMAKE]:                { header: 'bg-gradient-to-r from-rose-600 to-rose-500',        badge: 'bg-rose-400/40 text-white',        cardBorder: 'border-l-rose-400',    dot: 'bg-rose-400' },
  [LAB_WORKFLOW_STAGE.COMPLETED]:             { header: 'bg-gradient-to-r from-slate-600 to-slate-500',      badge: 'bg-slate-400/40 text-white',       cardBorder: 'border-l-slate-400',   dot: 'bg-slate-400' },
};

// Map target stage → best event type for the API
const STAGE_TO_EVENT: Record<string, string> = {
  [LAB_WORKFLOW_STAGE.COLLECTED]:             LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_PATIENT,
  [LAB_WORKFLOW_STAGE.RECEIVED_BY_LAB]:       LAB_WORKFLOW_EVENT_TYPE.RECEIVED_BY_LAB,
  [LAB_WORKFLOW_STAGE.IN_PRODUCTION]:         LAB_WORKFLOW_EVENT_TYPE.IN_PRODUCTION,
  [LAB_WORKFLOW_STAGE.READY]:                 LAB_WORKFLOW_EVENT_TYPE.READY_FOR_COLLECTION,
  [LAB_WORKFLOW_STAGE.DISPATCHED]:            LAB_WORKFLOW_EVENT_TYPE.COLLECTED_BY_DRIVER,
  [LAB_WORKFLOW_STAGE.RECEIVED_BY_PRACTICE]:  LAB_WORKFLOW_EVENT_TYPE.DROPPED_OFF_BY_ME,
  [LAB_WORKFLOW_STAGE.FITTED_TO_PATIENT]:     LAB_WORKFLOW_EVENT_TYPE.PATIENT_COLLECTED,
  [LAB_WORKFLOW_STAGE.RETURNED_FOR_ADJUSTMENT]: LAB_WORKFLOW_EVENT_TYPE.RETURNED_FOR_ADJUSTMENT,
  [LAB_WORKFLOW_STAGE.REMAKE]:                LAB_WORKFLOW_EVENT_TYPE.COMEBACK_REQUESTED,
  [LAB_WORKFLOW_STAGE.COMPLETED]:             LAB_WORKFLOW_EVENT_TYPE.SATISFACTION_SIGNED,
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
    workflow_stage: LAB_WORKFLOW_STAGE.CREATED,
  };
}

function defaultWorkflowForm(): WorkflowFormState {
  return {
    event_type: LAB_WORKFLOW_EVENT_TYPE.SLIP_EMAILED,
    notes: '',
    workflow_stage: LAB_WORKFLOW_STAGE.CREATED,
    shade: '',
    lab_driver_name: '',
    worker_name: '',
    expected_return_date: '',
    comeback_reason: '',
    patient_happy: false,
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
      workflow_stage: labCase.workflow_stage || LAB_WORKFLOW_STAGE.CREATED,
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
          comeback_reason: workflowForm.comeback_reason,
          patient_happy: workflowForm.patient_happy,
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

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const caseId = e.dataTransfer.getData('text/plain') || dragCaseId;
    setDragCaseId(null);
    if (!caseId) return;

    const labCase = labCases.find((c) => c.id === caseId);
    if (!labCase || labCase.workflow_stage === targetStage) return;

    // Optimistic update
    setLabCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, workflow_stage: targetStage } : c)),
    );

    const eventType = STAGE_TO_EVENT[targetStage] || LAB_WORKFLOW_EVENT_TYPE.SLIP_EMAILED;

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
      if (!response.ok) {
        await refreshLabCases(); // revert on failure
      }
    } catch {
      await refreshLabCases();
    } finally {
      setSavingCaseId(null);
    }
  };

  const handleDragEnd = () => {
    setDragCaseId(null);
    setDragOverStage(null);
  };

  const openCases = labCases.filter((item) => item.workflow_snapshot?.is_closed !== true);
  const closedCases = labCases.filter((item) => item.workflow_snapshot?.is_closed === true);
  const recallCases = labCases.filter((item) => item.workflow_snapshot?.requires_recall);

  const columns = [
    LAB_WORKFLOW_STAGE.CREATED,
    LAB_WORKFLOW_STAGE.COLLECTED,
    LAB_WORKFLOW_STAGE.RECEIVED_BY_LAB,
    LAB_WORKFLOW_STAGE.IN_PRODUCTION,
    LAB_WORKFLOW_STAGE.READY,
    LAB_WORKFLOW_STAGE.DISPATCHED,
    LAB_WORKFLOW_STAGE.RECEIVED_BY_PRACTICE,
    LAB_WORKFLOW_STAGE.FITTED_TO_PATIENT,
    LAB_WORKFLOW_STAGE.RETURNED_FOR_ADJUSTMENT,
    LAB_WORKFLOW_STAGE.REMAKE,
    LAB_WORKFLOW_STAGE.COMPLETED,
  ];

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lab Workflow Engine</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Track collection, slip handling, shade, lab handoff, and final sign-off
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreateForm((v) => !v)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md text-xs"
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
          { label: 'Open Cases', value: openCases.length, gradient: 'from-blue-600 to-cyan-500' },
          { label: 'Ready for Collection', value: labCases.filter((item) => item.workflow_stage === LAB_WORKFLOW_STAGE.READY).length, gradient: 'from-emerald-600 to-teal-500' },
          { label: 'Recall Needed', value: recallCases.length, gradient: 'from-amber-500 to-orange-500' },
          { label: 'Completed', value: closedCases.length, gradient: 'from-slate-600 to-slate-800' },
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {LAB_WORKFLOW_STAGES.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
              <Textarea value={newCase.slip_text} onChange={(e) => setNewCase({ ...newCase, slip_text: e.target.value })} placeholder="Slip notes" rows={2} className="md:col-span-2 lg:col-span-2 rounded-xl border-slate-200" />
              <Textarea value={newCase.description} onChange={(e) => setNewCase({ ...newCase, description: e.target.value })} placeholder="Case description" rows={2} className="md:col-span-2 lg:col-span-3 rounded-xl border-slate-200" />
              <div className="md:col-span-2 lg:col-span-3 flex gap-3">
                <Button onClick={createLabCase} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md" disabled={savingCaseId === 'new'}>
                  {savingCaseId === 'new' ? 'Creating...' : 'Create Lab Case'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)} className="border-slate-200">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KANBAN BOARD - full width */}
      <div className="w-full">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">Loading lab workflow...</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1 mb-3 max-w-7xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Workflow Board</p>
              <p className="text-xs text-slate-400">{labCases.length} cases · drag cards to move stages</p>
            </div>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3" style={{ minWidth: `${columns.length * 210}px`, padding: '0 2px' }}>
                {columns.map((stage) => {
                  const style = COLUMN_STYLE[stage] || { header: 'bg-slate-600', badge: 'bg-slate-400/40 text-white', cardBorder: 'border-l-slate-400', dot: 'bg-slate-400' };
                  const columnCases = labCases.filter((item) => (item.workflow_stage || LAB_WORKFLOW_STAGE.CREATED) === stage);
                  const isOver = dragOverStage === stage;

                  return (
                    <div
                      key={stage}
                      className="flex flex-col rounded-2xl overflow-hidden shadow-sm border border-slate-200/80"
                      style={{ width: '200px', minWidth: '200px' }}
                      onDragOver={(e) => handleDragOver(e, stage)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, stage)}
                    >
                      {/* Column header */}
                      <div className={`${style.header} px-3 py-2.5 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-wide">
                            {STAGE_SHORT[stage] || stage}
                          </span>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${style.badge}`}>
                          {columnCases.length}
                        </span>
                      </div>

                      {/* Drop zone body */}
                      <div
                        className={`flex-1 p-2 space-y-2 transition-colors min-h-[400px] ${
                          isOver
                            ? 'bg-blue-50 border-2 border-dashed border-blue-300'
                            : 'bg-slate-50/70'
                        }`}
                      >
                        {isOver && columnCases.length === 0 && (
                          <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-blue-300 text-xs text-blue-400 font-medium">
                            Drop here
                          </div>
                        )}
                        {columnCases.map((labCase) => {
                          const isDragging = dragCaseId === labCase.id;
                          const isSaving = savingCaseId === labCase.id;
                          const isExpanded = activeWorkflowCaseId === labCase.id;
                          const isOverdue = labCase.due_date && new Date(labCase.due_date) < new Date() && !labCase.workflow_snapshot?.is_closed;

                          return (
                            <div
                              key={labCase.id}
                              draggable={!isSaving}
                              onDragStart={(e) => handleDragStart(e, labCase.id)}
                              onDragEnd={handleDragEnd}
                              className={`
                                rounded-xl border bg-white shadow-sm select-none
                                border-l-4 ${style.cardBorder}
                                transition-all duration-150
                                ${isDragging ? 'opacity-40 scale-95 cursor-grabbing' : 'cursor-grab hover:shadow-md hover:-translate-y-0.5'}
                                ${isSaving ? 'opacity-60 pointer-events-none' : ''}
                              `}
                            >
                              <div className="p-3">
                                {/* Case number + closed badge */}
                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                  <span className="text-[11px] font-bold text-slate-700 leading-tight">{labCase.case_number}</span>
                                  <div className="flex flex-col items-end gap-1">
                                    {labCase.workflow_snapshot?.is_closed && (
                                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full leading-none">Done</span>
                                    )}
                                    {isOverdue && (
                                      <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full leading-none">Overdue</span>
                                    )}
                                  </div>
                                </div>

                                {/* Patient name */}
                                <p className="text-xs font-semibold text-slate-900 leading-tight">{labCase.patient_name}</p>

                                {/* Case type + lab */}
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{labCase.case_type}</p>
                                <p className="text-[11px] text-slate-400 leading-tight">{labCase.lab_name}</p>

                                {/* Shade */}
                                {labCase.shade && (
                                  <p className="text-[11px] text-violet-600 font-semibold mt-1">Shade: {labCase.shade}</p>
                                )}

                                {/* Due date */}
                                <p className={`text-[11px] mt-1 leading-tight ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                                  Due: {labCase.due_date ? formatDateSA(labCase.due_date) : '-'}
                                </p>

                                {/* Recall warning */}
                                {labCase.workflow_snapshot?.requires_recall && (
                                  <p className="text-[10px] font-bold text-amber-600 mt-1.5">⚠ Recall required</p>
                                )}

                                {isSaving && (
                                  <p className="text-[10px] text-blue-500 mt-1 font-medium animate-pulse">Saving...</p>
                                )}

                                {/* Log event button */}
                                <button
                                  onClick={() => isExpanded ? closeWorkflowForm() : openWorkflowForm(labCase)}
                                  disabled={isSaving}
                                  className="mt-2 w-full text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 py-1 px-2 rounded-lg transition-colors border border-slate-100 hover:border-blue-200"
                                >
                                  {isExpanded ? 'Cancel' : 'Log event →'}
                                </button>
                              </div>

                              {/* Inline event form */}
                              {isExpanded && workflowForm && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-2">
                                  <select
                                    value={workflowForm.event_type}
                                    onChange={(e) => updateWorkflowForm('event_type', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-300"
                                  >
                                    {Object.entries(EVENT_LABELS).map(([value, label]) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={workflowForm.workflow_stage}
                                    onChange={(e) => updateWorkflowForm('workflow_stage', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-300"
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
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
                                  />
                                  <button
                                    onClick={() => submitWorkflowEvent(labCase)}
                                    disabled={isSaving}
                                    className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-[11px] font-semibold py-1.5 hover:from-blue-700 hover:to-cyan-700 transition-all"
                                  >
                                    {isSaving ? 'Saving...' : 'Save event'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* All Lab Cases list */}
      <div className="max-w-7xl mx-auto">
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">All Lab Cases</CardTitle>
            <CardDescription className="text-xs">{loading ? 'Loading...' : `${labCases.length} total cases`}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading lab cases...</div>
            ) : (
              <div className="space-y-3">
                {labCases.map((labCase) => {
                  const isOpen = activeWorkflowCaseId === labCase.id;
                  const timeline = labCase.workflow_snapshot?.timeline || [];
                  const style = COLUMN_STYLE[labCase.workflow_stage] || COLUMN_STYLE[LAB_WORKFLOW_STAGE.CREATED];

                  return (
                    <div key={labCase.id} className={`rounded-xl border bg-white p-4 hover:border-blue-200 transition-colors border-l-4 ${style.cardBorder}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${style.header}`}>
                              {stageLabel(labCase.workflow_stage || LAB_WORKFLOW_STAGE.CREATED)}
                            </span>
                            {labCase.workflow_snapshot?.requires_recall && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Recall required</span>
                            )}
                            {labCase.workflow_snapshot?.is_closed && (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Closed</span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-900">
                            <Link href={`/patients/${labCase.patient_id}`} className="hover:text-blue-600 hover:underline">{labCase.patient_name}</Link>
                          </p>
                          <p className="text-sm text-slate-600 mt-1">{labCase.case_number} · {labCase.case_type}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            Lab: {labCase.lab_name} · Due: {labCase.due_date ? formatDateSA(labCase.due_date) : '-'}
                            {labCase.expected_return_date ? ` · Expected: ${formatDateSA(labCase.expected_return_date)}` : ''}
                          </p>
                          {labCase.shade && <p className="text-sm text-violet-600 font-medium mt-1">Shade: {labCase.shade}</p>}
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
                            className={isOpen ? 'border-slate-200 text-xs' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-sm text-xs'}
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
                              <select value={workflowForm.event_type} onChange={(e) => updateWorkflowForm('event_type', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                                {Object.entries(EVENT_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Workflow stage</span>
                              <select value={workflowForm.workflow_stage} onChange={(e) => updateWorkflowForm('workflow_stage', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
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
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Comeback reason</span>
                              <Input value={workflowForm.comeback_reason} onChange={(e) => updateWorkflowForm('comeback_reason', e.target.value)} placeholder="Reason if adjustment needed" className="rounded-xl border-slate-200" />
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</span>
                              <Textarea value={workflowForm.notes} onChange={(e) => updateWorkflowForm('notes', e.target.value)} rows={3} className="rounded-xl border-slate-200" />
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" checked={workflowForm.patient_happy} onChange={(e) => updateWorkflowForm('patient_happy', e.target.checked)} className="w-4 h-4" />
                              Patient is happy at recall and case can be closed
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button onClick={() => submitWorkflowEvent(labCase)} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md" disabled={savingCaseId === labCase.id}>
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
