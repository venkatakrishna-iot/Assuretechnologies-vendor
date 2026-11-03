export interface GstStateCode {
  code: string;
  name: string;
}

export const GST_STATE_CODES: GstStateCode[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Before Division)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
  { code: '99', name: 'Centre Jurisdiction' },
];

export const COMPANY_BASE_STATE_CODE = '37'; // Andhra Pradesh

export function getGstStateCode(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();

  if (/^\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{2}[A-Za-z0-9]/.test(trimmed)) {
    return trimmed.slice(0, 2);
  }

  const normalized = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  const match = GST_STATE_CODES.find(s => s.name.toLowerCase().replace(/[^a-z]/g, '') === normalized);
  if (match) return match.code;

  return '';
}

export function isSameStateAsCompany(stateOrCode?: string | null, baseCode = COMPANY_BASE_STATE_CODE): boolean {
  const code = getGstStateCode(stateOrCode);
  return Boolean(code && code === baseCode);
}

