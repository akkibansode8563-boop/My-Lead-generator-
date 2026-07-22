const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse: ' + data)); }
      });
    }).on('error', reject);
  });
}

async function test() {
  try {
    const json1 = await get('http://localhost:3000/api/leads?campaign_id=9eeb0275-95ce-47eb-ac4c-9a73286f82ca');
    console.log('Campaign 9eeb... API response:', json1.meta, 'Leads returned:', json1.data?.length);

    const json2 = await get('http://localhost:3000/api/leads?campaign_id=059c16c8-c638-461e-9d2f-a208b9441cd0');
    console.log('Campaign 059c... API response:', json2.meta, 'Leads returned:', json2.data?.length);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

test();
