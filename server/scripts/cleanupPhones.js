require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const { cleanIndianPhone } = require('../utils/phoneUtils');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCleanup() {
    console.log('Fetching all leads from Supabase...');
    
    // Fetch all leads that have a phone number
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .not('phone', 'is', null)
        .neq('phone', '');

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    console.log(`Found ${leads.length} leads with phone numbers. Analyzing...`);

    let updatedCount = 0;
    let clearedCount = 0;

    for (const lead of leads) {
        const phoneData = cleanIndianPhone(lead.phone);
        
        let needsUpdate = false;
        let newPhoneValue = lead.phone;
        
        // If the number is invalid, let's just clear it to avoid calling wrong numbers
        if (!phoneData.isValid) {
            newPhoneValue = '';
            clearedCount++;
            needsUpdate = true;
        } 
        // If it's valid but the stored string differs from the strictly cleaned string
        else if (lead.phone !== phoneData.cleaned) {
            newPhoneValue = phoneData.cleaned;
            updatedCount++;
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log(`Updating Lead: ${lead.company_name} | Old: ${lead.phone} | New: ${newPhoneValue === '' ? '[CLEARED - INVALID]' : newPhoneValue}`);
            
            // We preserve the JSONB structure
            const enrichedData = lead.ai_enriched_data || {};
            enrichedData.phone_valid = phoneData.isValid;
            if (phoneData.isValid) {
                enrichedData.formatted_phone = phoneData.formatted;
            }

            const { error: updateError } = await supabase
                .from('leads')
                .update({ 
                    phone: newPhoneValue,
                    ai_enriched_data: enrichedData
                })
                .eq('id', lead.id);

            if (updateError) {
                console.error(`Failed to update ${lead.id}:`, updateError.message);
            }
        }
    }

    console.log('\n--- Cleanup Complete ---');
    console.log(`Total leads analyzed: ${leads.length}`);
    console.log(`Valid numbers correctly reformatted: ${updatedCount}`);
    console.log(`Invalid/Corrupted numbers cleared: ${clearedCount}`);
}

runCleanup();
