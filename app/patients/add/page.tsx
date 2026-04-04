'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';

export default function AddPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    idNumber: '',
    dateOfBirth: '',
    mobile: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    gender: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    
    // Medical Information
    allergies: '',
    medicalConditions: '',
    currentMedications: '',
    
    // Medical Aid
    medicalAidScheme: '',
    medicalAidNumber: '',
    dependentCode: '',
    mainMemberName: '',
    
    // Contact Preferences
    preferredContactMethod: 'mobile',
    referredBy: '',
    
    // Consents
    whatsappConsent: false,
    callRecordingConsent: false,
    popiaConsent: false,
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create patient
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert([
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            id_number: formData.idNumber,
            date_of_birth: formData.dateOfBirth,
            mobile: formData.mobile,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postalCode,
            gender: formData.gender,
            emergency_contact_name: formData.emergencyContactName,
            emergency_contact_phone: formData.emergencyContactPhone,
            preferred_contact_method: formData.preferredContactMethod,
            referred_by: formData.referredBy,
          },
        ])
        .select();

      if (patientError) throw patientError;
      if (!patient || patient.length === 0) throw new Error('Failed to create patient');

      const patientId = patient[0].id;

      // Create medical history
      if (formData.allergies || formData.medicalConditions || formData.currentMedications) {
        await supabase
          .from('patient_medical_history')
          .insert([
            {
              patient_id: patientId,
              allergies: formData.allergies,
              medical_conditions: formData.medicalConditions,
              current_medications: formData.currentMedications,
            },
          ]);
      }

      // Create medical aid details
      if (formData.medicalAidScheme) {
        await supabase
          .from('patient_medical_aid')
          .insert([
            {
              patient_id: patientId,
              scheme_name: formData.medicalAidScheme,
              member_number: formData.medicalAidNumber,
              dependent_code: formData.dependentCode,
              main_member_name: formData.mainMemberName,
            },
          ]);
      }

      // Create communication consents
      await supabase
        .from('patient_communication_consent')
        .insert([
          {
            patient_id: patientId,
            whatsapp_consent: formData.whatsappConsent,
            call_recording_consent: formData.callRecordingConsent,
            popia_consent: formData.popiaConsent,
          },
        ]);

      router.push('/patients');
    } catch (err: any) {
      console.error('[v0] Error creating patient:', err);
      setError(err.message || 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-[#f1f5f9] min-h-full">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 px-6 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors mb-4">
              ← Back to Patients
            </button>
            <h1 className="text-3xl font-bold text-white">Add New Patient</h1>
            <p className="text-white/70 text-sm mt-1">Create a comprehensive patient profile</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal Information */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="First name"
                    className="rounded-xl border-slate-200"
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Last name"
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="ID Number"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    placeholder="ID/Passport number"
                    className="rounded-xl border-slate-200"
                  />
                  <Input
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    className="rounded-xl border-slate-200"
                  />
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Select gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mobile Number"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="Mobile number"
                    className="rounded-xl border-slate-200"
                  />
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <Input
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address"
                  className="rounded-xl border-slate-200 w-full"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="rounded-xl border-slate-200"
                  />
                  <Input
                    label="Postal Code"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="Postal code"
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-base">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Emergency Contact Name"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Name"
                  className="rounded-xl border-slate-200 w-full"
                />
                <Input
                  label="Emergency Contact Phone"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  className="rounded-xl border-slate-200 w-full"
                />
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-base">Medical History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="List any allergies"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <textarea
                  name="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={handleChange}
                  placeholder="Medical conditions"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <textarea
                  name="currentMedications"
                  value={formData.currentMedications}
                  onChange={handleChange}
                  placeholder="Current medications"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </CardContent>
            </Card>

            {/* Medical Aid */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-base">Medical Aid Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Medical Aid Scheme"
                  name="medicalAidScheme"
                  value={formData.medicalAidScheme}
                  onChange={handleChange}
                  placeholder="Scheme name"
                  className="rounded-xl border-slate-200 w-full"
                />
                <Input
                  label="Member Number"
                  name="medicalAidNumber"
                  value={formData.medicalAidNumber}
                  onChange={handleChange}
                  placeholder="Member number"
                  className="rounded-xl border-slate-200 w-full"
                />
                <Input
                  label="Dependent Code"
                  name="dependentCode"
                  value={formData.dependentCode}
                  onChange={handleChange}
                  placeholder="Dependent code"
                  className="rounded-xl border-slate-200 w-full"
                />
                <Input
                  label="Main Member Name"
                  name="mainMemberName"
                  value={formData.mainMemberName}
                  onChange={handleChange}
                  placeholder="Main member name"
                  className="rounded-xl border-slate-200 w-full"
                />
              </CardContent>
            </Card>

            {/* Contact Preferences & Consents */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-base">Contact Preferences & Consents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Preferred Contact Method</label>
                  <select
                    name="preferredContactMethod"
                    value={formData.preferredContactMethod}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="mobile">Mobile</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <Input
                  label="Referred By"
                  name="referredBy"
                  value={formData.referredBy}
                  onChange={handleChange}
                  placeholder="Doctor name or source"
                  className="rounded-xl border-slate-200 w-full"
                />
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="whatsappConsent"
                      checked={formData.whatsappConsent}
                      onChange={handleChange}
                      className="w-4 h-4 mr-2"
                    />
                    <span className="text-sm text-slate-700">WhatsApp communication consent</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="callRecordingConsent"
                      checked={formData.callRecordingConsent}
                      onChange={handleChange}
                      className="w-4 h-4 mr-2"
                    />
                    <span className="text-sm text-slate-700">Call recording consent</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="popiaConsent"
                      checked={formData.popiaConsent}
                      onChange={handleChange}
                      className="w-4 h-4 mr-2"
                    />
                    <span className="text-sm text-slate-700">POPIA consent</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex gap-3 pb-8">
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-md px-8"
              >
                {loading ? 'Creating…' : 'Create Patient'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-slate-200"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
