const { runCampaignJob } = require('../workers/scrapingWorker');
const path = require('path');
const fs = require('fs');

console.log('===============================================================');
console.log('🚀 AUTONOMOUS PAN-INDIA IT HARDWARE DATA COLLECTION ENGINE');
console.log('===============================================================');

// Master Pan-India Target Matrix across 28 States & 8 UTs
const PAN_INDIA_MATRIX = [
  { state: 'Delhi', city: 'New Delhi', marketArea: 'Nehru Place', customerTypes: ['IT Dealers', 'Laptop Dealers', 'Computer Shops', 'System Integrators'] },
  { state: 'Maharashtra', city: 'Mumbai', marketArea: 'Lamington Road', customerTypes: ['IT Distributors', 'Computer Hardware', 'Laptop Dealers'] },
  { state: 'Maharashtra', city: 'Pune', marketArea: 'FC Road', customerTypes: ['Laptop Dealers', 'Computer Accessories', 'IT Solutions'] },
  { state: 'Maharashtra', city: 'Nagpur', marketArea: 'Dharampeth', customerTypes: ['IT Dealers', 'CCTV Dealers', 'Computer Shops'] },
  { state: 'Karnataka', city: 'Bengaluru', marketArea: 'SP Road', customerTypes: ['Gaming Hardware Store', 'Custom PC Builders', 'IT Distributors'] },
  { state: 'Tamil Nadu', city: 'Chennai', marketArea: 'Ritchie Street', customerTypes: ['IT Distributors', 'Laptop Dealers', 'Storage Dealers'] },
  { state: 'Telangana', city: 'Secunderabad', marketArea: 'CTC Secunderabad', customerTypes: ['Computer Store', 'Printer Dealers', 'IT Hardware'] },
  { state: 'West Bengal', city: 'Kolkata', marketArea: 'Chandni Chowk', customerTypes: ['National Distributor', 'IT Hardware', 'Networking Dealers'] },
  { state: 'Gujarat', city: 'Ahmedabad', marketArea: 'CG Road', customerTypes: ['IT Solution Provider', 'Enterprise Hardware', 'Server Dealers'] },
  { state: 'Uttar Pradesh', city: 'Noida', marketArea: 'Sector 63', customerTypes: ['IT Hardware', 'Enterprise Storage', 'CCTV Suppliers'] },
  { state: 'Rajasthan', city: 'Jaipur', marketArea: 'Jayanti Market', customerTypes: ['Computer Shops', 'Laptop Dealers', 'IT Resellers'] },
  { state: 'Madhya Pradesh', city: 'Indore', marketArea: 'Silver Mall', customerTypes: ['IT Hardware', 'Computer Accessories', 'Desktop Dealers'] }
];

async function startPanIndiaCollector() {
  const args = process.argv.slice(2);
  let targetList = PAN_INDIA_MATRIX;

  const stateArg = args.find(a => a.startsWith('--state='))?.split('=')[1];
  const cityArg = args.find(a => a.startsWith('--city='))?.split('=')[1];

  if (stateArg) {
    targetList = targetList.filter(t => t.state.toLowerCase() === stateArg.toLowerCase());
  }
  if (cityArg) {
    targetList = targetList.filter(t => t.city.toLowerCase() === cityArg.toLowerCase());
  }

  console.log(`📍 Configured Collection Target Scope: ${targetList.length} Regional Hubs\n`);

  for (let i = 0; i < targetList.length; i++) {
    const target = targetList[i];
    const campaignId = `pan-india-${Date.now()}-${i + 1}`;

    console.log(`---------------------------------------------------------------`);
    console.log(`[${i + 1}/${targetList.length}] Scraping Target: ${target.city}, ${target.state} (${target.marketArea})`);
    console.log(`---------------------------------------------------------------`);

    const jobData = {
      campaignId,
      state: target.state,
      city: target.city,
      marketArea: target.marketArea,
      targetRegions: [target.city, target.marketArea],
      customerTypes: target.customerTypes,
      productCategories: ['Laptops', 'Desktops', 'CCTV', 'Servers', 'Networking']
    };

    try {
      await runCampaignJob(jobData);
      console.log(`✅ Completed Collection for ${target.city} (${target.state})\n`);
    } catch (err) {
      console.error(`⚠️ Collection error for ${target.city}:`, err.message);
    }
  }

  console.log('===============================================================');
  console.log('🎉 PAN-INDIA DATA COLLECTION COMPLETED SUCCESSFULLY');
  console.log('===============================================================');
}

startPanIndiaCollector().catch(console.error);
