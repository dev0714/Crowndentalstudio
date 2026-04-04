import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  try {
    console.log('Starting database seeding...\n');

    // Seed Patients
    console.log('Seeding patients...');
    const patients = [
      {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '0721234567',
        status: 'Active',
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.j@example.com',
        phone: '0722345678',
        status: 'Active',
      },
      {
        first_name: 'Michael',
        last_name: 'Brown',
        email: 'michael.b@example.com',
        phone: '0723456789',
        status: 'Inactive',
      },
      {
        first_name: 'Emma',
        last_name: 'Wilson',
        email: 'emma.w@example.com',
        phone: '0724567890',
        status: 'Active',
      },
    ];

    for (const patient of patients) {
      const { error } = await supabase.from('patients').insert([patient]);
      if (error && error.code !== '23505') {
        console.error('Error inserting patient:', error);
      }
    }
    console.log('✓ Patients seeded\n');

    // Seed Appointments
    console.log('Seeding appointments...');
    const appointments = [
      {
        patient_name: 'John Smith',
        date: '2024-03-10',
        time: '09:00 AM',
        type: 'Checkup',
        doctor: 'Dr. Johnson',
        status: 'Scheduled',
      },
      {
        patient_name: 'Sarah Johnson',
        date: '2024-03-10',
        time: '10:00 AM',
        type: 'Cleaning',
        doctor: 'Dr. Smith',
        status: 'Confirmed',
      },
      {
        patient_name: 'Michael Brown',
        date: '2024-03-11',
        time: '02:00 PM',
        type: 'Root Canal',
        doctor: 'Dr. Johnson',
        status: 'Scheduled',
      },
      {
        patient_name: 'Emma Wilson',
        date: '2024-03-11',
        time: '03:30 PM',
        type: 'Extraction',
        doctor: 'Dr. Williams',
        status: 'Scheduled',
      },
    ];

    for (const appointment of appointments) {
      const { error } = await supabase.from('appointments').insert([appointment]);
      if (error && error.code !== '23505') {
        console.error('Error inserting appointment:', error);
      }
    }
    console.log('✓ Appointments seeded\n');

    // Seed Leads
    console.log('Seeding leads...');
    const leads = [
      {
        name: 'John Smith',
        email: 'john@example.com',
        phone: '0721234567',
        source: 'Google',
        status: 'New',
        date: '2024-03-10',
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '0722345678',
        source: 'Referral',
        status: 'Contacted',
        date: '2024-03-09',
      },
      {
        name: 'Michael Brown',
        email: 'michael@example.com',
        phone: '0723456789',
        source: 'Facebook',
        status: 'Qualified',
        date: '2024-03-08',
      },
      {
        name: 'Emma Wilson',
        email: 'emma@example.com',
        phone: '0724567890',
        source: 'Direct Call',
        status: 'New',
        date: '2024-03-07',
      },
    ];

    for (const lead of leads) {
      const { error } = await supabase.from('leads').insert([lead]);
      if (error && error.code !== '23505') {
        console.error('Error inserting lead:', error);
      }
    }
    console.log('✓ Leads seeded\n');

    // Seed Invoices
    console.log('Seeding invoices...');
    const invoices = [
      {
        invoice_number: 'INV-2024-001',
        patient_name: 'John Smith',
        amount: 1500,
        status: 'Paid',
        due_date: '2024-03-01',
      },
      {
        invoice_number: 'INV-2024-002',
        patient_name: 'Sarah Johnson',
        amount: 2200,
        status: 'Overdue',
        due_date: '2024-02-28',
      },
      {
        invoice_number: 'INV-2024-003',
        patient_name: 'Michael Brown',
        amount: 800,
        status: 'Partially Paid',
        due_date: '2024-03-10',
      },
      {
        invoice_number: 'INV-2024-004',
        patient_name: 'Emma Wilson',
        amount: 3500,
        status: 'Issued',
        due_date: '2024-03-15',
      },
    ];

    for (const invoice of invoices) {
      const { error } = await supabase.from('invoices').insert([invoice]);
      if (error && error.code !== '23505') {
        console.error('Error inserting invoice:', error);
      }
    }
    console.log('✓ Invoices seeded\n');

    // Seed Stock
    console.log('Seeding stock...');
    const stock = [
      {
        item_code: 'MAT-001',
        item_name: 'Composite Resin A2',
        category: 'Restorative',
        quantity_on_hand: 45,
        reorder_level: 20,
        expiry_date: '2024-12-31',
        unit_cost: 150,
      },
      {
        item_code: 'MAT-002',
        item_name: 'Glass Ionomer',
        category: 'Restorative',
        quantity_on_hand: 12,
        reorder_level: 25,
        expiry_date: '2024-09-15',
        unit_cost: 120,
      },
      {
        item_code: 'INS-001',
        item_name: 'Dental Burs Set',
        category: 'Instruments',
        quantity_on_hand: 8,
        reorder_level: 10,
        unit_cost: 200,
      },
      {
        item_code: 'SUP-001',
        item_name: 'Dental Gloves (Box)',
        category: 'Supplies',
        quantity_on_hand: 25,
        reorder_level: 50,
        unit_cost: 45,
      },
    ];

    for (const item of stock) {
      const { error } = await supabase.from('stock').insert([item]);
      if (error && error.code !== '23505') {
        console.error('Error inserting stock:', error);
      }
    }
    console.log('✓ Stock seeded\n');

    // Seed Lab Cases
    console.log('Seeding lab cases...');
    const labCases = [
      {
        case_number: 'LAB-001',
        patient_name: 'John Smith',
        case_type: 'Crown',
        status: 'In Progress',
        due_date: '2024-03-15',
        lab_name: 'ProLab Dental',
      },
      {
        case_number: 'LAB-002',
        patient_name: 'Sarah Johnson',
        case_type: 'Bridge',
        status: 'Quality Check',
        due_date: '2024-03-12',
        lab_name: 'Dental Excellence',
      },
      {
        case_number: 'LAB-003',
        patient_name: 'Michael Brown',
        case_type: 'Veneer',
        status: 'Ready',
        due_date: '2024-03-10',
        lab_name: 'ProLab Dental',
      },
      {
        case_number: 'LAB-004',
        patient_name: 'Emma Wilson',
        case_type: 'Crown',
        status: 'Received',
        due_date: '2024-03-20',
        lab_name: 'Dental Solutions',
      },
    ];

    for (const labCase of labCases) {
      const { error } = await supabase.from('lab_cases').insert([labCase]);
      if (error && error.code !== '23505') {
        console.error('Error inserting lab case:', error);
      }
    }
    console.log('✓ Lab cases seeded\n');

    console.log('✓ Database seeding completed successfully!');
  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  }
}

seedDatabase();
