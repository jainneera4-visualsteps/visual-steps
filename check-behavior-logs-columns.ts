
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkColumns() {
    // This is a hacky way to check columns, try selecting 0 rows with all columns
    const { data, error } = await supabase.from('behavior_logs').select('*').limit(0);
    if(error) {
        console.log('Error checking columns:', error.message);
    } else {
        console.log('Columns structure (of empty set):', data);
        // If it returns an empty array, it does not show columns.
    }
}
checkColumns();
