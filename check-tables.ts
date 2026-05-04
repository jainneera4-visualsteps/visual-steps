
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables'); // Or some other way
    if(error) {
        console.log('Error listing tables (via rpc):', error);                
        // Try another way if possible
        const { data: data2, error: error2 } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
            
        if(error2) {
             console.log('Error listing tables (via info_schema):', error2);
        } else {
             console.log('Tables:', data2);
        }
    } else {
        console.log('Tables:', data);
    }
}
listTables();
