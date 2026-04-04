export type StaffComplianceProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  hpcsa_registration_number?: string | null;
  id_document_uploaded?: boolean | null;
  proof_of_address_uploaded?: boolean | null;
  contract_signed?: boolean | null;
  nda_signed?: boolean | null;
  restraint_signed?: boolean | null;
  training_repayment_clause_signed?: boolean | null;
};

export type StaffComplianceStatus = 'Ready' | 'Needs Attention' | 'Inactive';

export type StaffComplianceProfileSummary = StaffComplianceProfile & {
  complianceStatus: StaffComplianceStatus;
  missingItems: string[];
};

export type StaffComplianceSummary = {
  totalStaff: number;
  readyStaffCount: number;
  needsAttentionCount: number;
  inactiveStaffCount: number;
  missingHpcsaCount: number;
  missingDocumentsCount: number;
  profiles: StaffComplianceProfileSummary[];
};

function missingItemList(profile: StaffComplianceProfile) {
  const missingItems: string[] = [];

  if (!profile.hpcsa_registration_number?.trim() && profile.role === 'Doctor') {
    missingItems.push('HPCSA registration');
  }
  if (!profile.id_document_uploaded) missingItems.push('ID document');
  if (!profile.proof_of_address_uploaded) missingItems.push('Proof of address');
  if (!profile.contract_signed) missingItems.push('Contract');
  if (!profile.nda_signed) missingItems.push('NDA');
  if (!profile.restraint_signed) missingItems.push('Restraint');
  if (!profile.training_repayment_clause_signed) missingItems.push('Training repayment clause');

  return missingItems;
}

export function buildStaffComplianceSummary(profiles: StaffComplianceProfile[]): StaffComplianceSummary {
  let readyStaffCount = 0;
  let needsAttentionCount = 0;
  let inactiveStaffCount = 0;
  let missingHpcsaCount = 0;
  let missingDocumentsCount = 0;

  const summaries = profiles.map((profile) => {
    const missingItems = missingItemList(profile);
    const complianceStatus: StaffComplianceStatus = !profile.is_active
      ? 'Inactive'
      : missingItems.length === 0
        ? 'Ready'
        : 'Needs Attention';

    if (complianceStatus === 'Ready') readyStaffCount += 1;
    if (complianceStatus === 'Needs Attention') needsAttentionCount += 1;
    if (complianceStatus === 'Inactive') inactiveStaffCount += 1;
    if (!profile.hpcsa_registration_number?.trim() && profile.role === 'Doctor') missingHpcsaCount += 1;
    if (missingItems.some((item) => item !== 'HPCSA registration')) missingDocumentsCount += 1;

    return {
      ...profile,
      complianceStatus,
      missingItems,
    };
  });

  return {
    totalStaff: profiles.length,
    readyStaffCount,
    needsAttentionCount,
    inactiveStaffCount,
    missingHpcsaCount,
    missingDocumentsCount,
    profiles: summaries,
  };
}
