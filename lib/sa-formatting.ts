// South African Formatting Utilities

/**
 * Format currency to South African Rand (ZAR)
 * @param amount - Amount in ZAR
 * @returns Formatted string (e.g., "R 1,234.56")
 */
export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format South African phone number
 * @param phone - Phone number (raw digits or with formatting)
 * @returns Formatted phone number (e.g., "+27 (11) 234 5678" or "011 234 5678")
 */
export function formatPhoneSA(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.length === 10 && !digits.startsWith('0')) {
    // If 10 digits without leading 0, assume it's missing the country code
    const formatted = `0${digits}`;
    return formatted.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  
  if (digits.length === 10 && digits.startsWith('0')) {
    // Local format: 0XX XXX XXXX
    return digits.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  
  if (digits.length === 11 && digits.startsWith('27')) {
    // International format: +27 XX XXX XXXX
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  
  if (digits.startsWith('27')) {
    // Clean international format
    const localDigits = '0' + digits.slice(2);
    return localDigits.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  
  // Return as-is if format doesn't match
  return phone;
}

/**
 * Format date in South African format (DD/MM/YYYY)
 * @param date - Date object or date string
 * @returns Formatted date string (e.g., "25/03/2024")
 */
export function formatDateSA(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

/**
 * Format date and time in South African format
 * @param date - Date object or date string
 * @returns Formatted datetime string (e.g., "25/03/2024 14:30")
 */
export function formatDateTimeSA(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const dateStr = new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
  
  const timeStr = dateObj.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  return `${dateStr} ${timeStr}`;
}

/**
 * Format medical aid number (South African format)
 * @param medicalAidNum - Medical aid number
 * @returns Formatted medical aid number
 */
export function formatMedicalAidSA(medicalAidNum: string): string {
  if (!medicalAidNum) return '';
  const digits = medicalAidNum.replace(/\D/g, '');
  
  // Most SA medical aid numbers are 9-10 digits, format as needed
  if (digits.length >= 8) {
    return digits.replace(/(\d{4})(\d{4})(\d+)/, '$1 $2 $3');
  }
  
  return medicalAidNum;
}

/**
 * Get South African provinces
 * @returns Array of province names
 */
export function getProvincesSA(): string[] {
  return [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West',
    'Western Cape',
  ];
}

/**
 * Get South African cities by province
 * @param province - Province name
 * @returns Array of city names
 */
export function getCitiesSA(province: string): string[] {
  const cities: { [key: string]: string[] } = {
    'Western Cape': ['Cape Town', 'Stellenbosch', 'Paarl', 'Bellville', 'Somerset West'],
    Gauteng: ['Johannesburg', 'Pretoria', 'Sandton', 'Boksburg', 'Soweto'],
    'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Newcastle', 'Richards Bay', 'Umhlanga'],
    'Eastern Cape': ['Port Elizabeth', 'East London', 'Gqeberha', 'Uitenhage', 'Grahamstown'],
    'Free State': ['Bloemfontein', 'Welkom', 'Harrismith', 'Bethlehem', 'Sasolburg'],
    Limpopo: ['Polokwane', 'Thohoyandou', 'Musina', 'Louis Trichardt', 'Makhado'],
    Mpumalanga: ['Mbombela', 'Emalahleni', 'Secunda', 'eMbalenhle', 'Groblersdal'],
    'Northern Cape': ['Kimberley', 'Upington', 'De Aar', 'Kuruman', 'Kathu'],
    'North West': ['Mafikeng', 'Rustenburg', 'Potchefstroom', 'Klerksdorp', 'Lichtenburg'],
  };
  
  return cities[province] || [];
}
