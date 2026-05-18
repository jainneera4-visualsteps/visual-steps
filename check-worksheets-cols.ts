import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: row, error } = await supabase.from('worksheets').select('*').limit(1);
    if (error) {
        console.error('Error fetching worksheet:', error);
    } else if (row && row.length > 0) {
        console.log('Columns found in worksheets:', Object.keys(row[0]));
    } else {
        console.log('Worksheets table is empty.');
    }
}
check();
