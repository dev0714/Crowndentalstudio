'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateSA } from '@/lib/sa-formatting';
import { APPOINTMENT_STATUS } from '@/lib/workflows/status-definitions';

interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
}

interface PatientOption {
  id: string;
  first_name: string;
  last_name: string;
}

function AppointmentsContent() {
  const searchParams = useSearchParams();
  const prefillPatientId = searchParams.get('patientId') || '';
  const shouldOpenBooking = searchParams.get('open') === '1' || Boolean(prefillPatientId);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(shouldOpenBooking);
  const [isSaving, setIsSaving] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    patient_id: prefillPatientId,
    appointment_date: '',
    appointment_type: 'Consult',
    duration_minutes: '30',
    room_number: '',
    assigned_doctor: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    appointmentType: '',
    patientId: '',
    sortBy: 'appointment_date',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  const loadAppointments = async () => {
    const [appointmentsResponse, patientsResponse] = await Promise.all([
      fetch('/api/crm/appointments?limit=1000&page=1', {
        credentials: 'include',
      }),
      fetch('/api/crm/patients?limit=1000&page=1', {
        credentials: 'include',
      }),
    ]);

    const appointmentsPayload = await appointmentsResponse.json().catch(() => ({}));
    if (!appointmentsResponse.ok) {
      throw new Error(appointmentsPayload.error || 'Failed to load appointments');
    }

    const patientsPayload = await patientsResponse.json().catch(() => ({}));
    if (!patientsResponse.ok) {
      throw new Error(patientsPayload.error || 'Failed to load patients');
    }

    const patientRows = (patientsPayload.data || []) as PatientOption[];
    setAppointments(appointmentsPayload.data || []);
    setPatients(patientRows);
    setPatientNames(
      Object.fromEntries(
        patientRows.map((patient) => [
          patient.id,
          `${patient.first_name} ${patient.last_name}`.trim(),
        ]),
      ),
    );
    setBookingForm((prev) => ({
      ...prev,
      patient_id: prev.patient_id || patientRows[0]?.id || '',
    }));
  };

  const filteredAppointments = appointments
    .filter((apt) => {
      if (filters.dateFrom && new Date(apt.appointment_date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(apt.appointment_date) > new Date(filters.dateTo)) return false;
      if (filters.status && apt.status !== filters.status) return false;
      if (filters.appointmentType && !apt.appointment_type.toLowerCase().includes(filters.appointmentType.toLowerCase())) return false;
      if (filters.patientId && apt.patient_id !== filters.patientId) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[filters.sortBy as keyof Appointment];
      const bVal = b[filters.sortBy as keyof Appointment];
      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        await loadAppointments();
      } catch (err) {
        console.error('[v0] Error fetching appointments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  useEffect(() => {
    if (prefillPatientId) {
      setBookingForm((prev) => ({
        ...prev,
        patient_id: prefillPatientId,
      }));
      setIsBookingOpen(true);
    }
  }, [prefillPatientId]);

  const handleBookAppointment = async () => {
    if (!bookingForm.patient_id || !bookingForm.appointment_date || !bookingForm.appointment_type) {
      setError('Patient, date, and appointment type are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/crm/appointments', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: bookingForm.patient_id,
          appointment_date: bookingForm.appointment_date,
          appointment_type: bookingForm.appointment_type,
          duration_minutes: Number(bookingForm.duration_minutes || 30),
          room_number: bookingForm.room_number || null,
          assigned_doctor: bookingForm.assigned_doctor || null,
          notes: bookingForm.notes || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to book appointment');
      }

      setIsBookingOpen(false);
      setBookingForm((prev) => ({
        ...prev,
        appointment_date: '',
        appointment_type: 'Consult',
        duration_minutes: '30',
        room_number: '',
        assigned_doctor: '',
        notes: '',
      }));
      await loadAppointments();
    } catch (err) {
      console.error('[v0] Error booking appointment:', err);
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setIsSaving(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case APPOINTMENT_STATUS.SCHEDULED:
        return 'bg-blue-100 text-blue-700';
      case APPOINTMENT_STATUS.CONFIRMED:
        return 'bg-green-100 text-green-700';
      case APPOINTMENT_STATUS.CANCELLED:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
            <p className="text-slate-500 text-sm mt-0.5">View and manage appointment schedules</p>
          </div>
          <Button
            onClick={() => setIsBookingOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md border-0"
          >
            + Book Appointment
          </Button>
        </div>

        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
              <DialogDescription>Create a new appointment for an existing patient.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="patient_id">Patient</Label>
                <select
                  id="patient_id"
                  value={bookingForm.patient_id}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, patient_id: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select a patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="appointment_date">Appointment Date & Time</Label>
                  <Input
                    id="appointment_date"
                    type="datetime-local"
                    value={bookingForm.appointment_date}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, appointment_date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appointment_type">Appointment Type</Label>
                  <Input
                    id="appointment_type"
                    value={bookingForm.appointment_type}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, appointment_type: e.target.value }))}
                    placeholder="Consult, Hygiene, Emergency..."
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min={15}
                    step={15}
                    value={bookingForm.duration_minutes}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="room_number">Room</Label>
                  <Input
                    id="room_number"
                    value={bookingForm.room_number}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, room_number: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assigned_doctor">Doctor ID</Label>
                  <Input
                    id="assigned_doctor"
                    value={bookingForm.assigned_doctor}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, assigned_doctor: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Optional appointment notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleBookAppointment}
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                {isSaving ? 'Booking…' : 'Book Appointment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-500">Patient</p>
                    <p className="text-slate-900">{patientNames[selectedAppointment.patient_id] || selectedAppointment.patient_id}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Status</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Date & Time</p>
                    <p className="text-slate-900">{formatDateSA(selectedAppointment.appointment_date)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Duration</p>
                    <p className="text-slate-900">{selectedAppointment.duration_minutes} minutes</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-medium text-slate-500">Type</p>
                    <p className="text-slate-900">{selectedAppointment.appointment_type}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <Card className="border border-slate-200 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">All Statuses</option>
                      {Object.values(APPOINTMENT_STATUS).map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Appointment Type</Label>
                    <Input
                      placeholder="e.g., Consult, Hygiene"
                      value={filters.appointmentType}
                      onChange={(e) => setFilters((prev) => ({ ...prev, appointmentType: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Patient</Label>
                    <select
                      value={filters.patientId}
                      onChange={(e) => setFilters((prev) => ({ ...prev, patientId: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">All Patients</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Sort By</Label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="appointment_date">Date</option>
                      <option value="appointment_type">Type</option>
                      <option value="status">Status</option>
                      <option value="duration_minutes">Duration</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Order</Label>
                    <select
                      value={filters.sortOrder}
                      onChange={(e) => setFilters((prev) => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="desc">Descending (Newest first)</option>
                      <option value="asc">Ascending (Oldest first)</option>
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setFilters({
                      dateFrom: '',
                      dateTo: '',
                      status: '',
                      appointmentType: '',
                      patientId: '',
                      sortBy: 'appointment_date',
                      sortOrder: 'desc',
                    })}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border border-slate-200 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle>Appointments Schedule</CardTitle>
                <CardDescription>
                  {loading ? 'Loading...' : filteredAppointments.length === appointments.length 
                    ? `${appointments.length} appointments` 
                    : `${filteredAppointments.length} of ${appointments.length} appointments`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">Loading appointments...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-start justify-between p-4 bg-slate-50 rounded hover:bg-slate-100 transition-colors border-l-4 border-slate-400 cursor-pointer"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">
                              {patientNames[apt.patient_id] || apt.patient_id}
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-slate-600">
                              <div>
                                <span className="font-medium">Date:</span> {formatDateSA(apt.appointment_date)}
                              </div>
                              <div>
                                <span className="font-medium">Duration:</span> {apt.duration_minutes} min
                              </div>
                              <div>
                                <span className="font-medium">Type:</span> {apt.appointment_type}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor(apt.status)}`}>
                              {apt.status}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(apt)}>
                              Details
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-slate-600">No appointments found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <DashboardLayout>
      <AppointmentsContent />
    </DashboardLayout>
  );
}
