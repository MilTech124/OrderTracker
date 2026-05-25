/**
 * Jednorazowy skrypt: usuwa pole `location` z zamówień, które mają
 * location.type = "Point" ale brak location.coordinates (błędny GeoJSON).
 * Uruchom: node scripts/fixBrokenLocations.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Połączono');

  const result = await mongoose.connection.db
    .collection('orders')
    .updateMany(
      {
        'location.type': 'Point',
        'location.coordinates': { $exists: false },
      },
      { $unset: { location: '' } }
    );

  console.log(`Naprawiono dokumentów: ${result.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
