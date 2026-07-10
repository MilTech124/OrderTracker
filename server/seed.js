require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
const { getOrderModel } = require('./lib/getOrderModel');
const connectDB = require('./db');

const DUMMY_ADDRESSES = [
  // POLSKA
  // Warszawa
  { firstName: 'Jan', lastName: 'Kowalski', address: 'ul. Marszałkowska 142', city: 'Warszawa', postalCode: '00-017', phone: '+48 12 345 6789', country: 'pl', lat: 52.2297, lng: 21.0122 },
  { firstName: 'Maria', lastName: 'Nowak', address: 'Al. Jerozolimskie 80', city: 'Warszawa', postalCode: '00-024', phone: '+48 12 345 6790', country: 'pl', lat: 52.2237, lng: 21.0122 },
  { firstName: 'Piotr', lastName: 'Lewandowski', address: 'ul. Pulawska 45', city: 'Warszawa', postalCode: '02-595', phone: '+48 12 345 6791', country: 'pl', lat: 52.1560, lng: 21.0414 },

  // Kraków
  { firstName: 'Anna', lastName: 'Wiśniewski', address: 'Rynek Główny 1', city: 'Kraków', postalCode: '31-042', phone: '+48 12 345 6792', country: 'pl', lat: 50.0647, lng: 19.9450 },
  { firstName: 'Tomasz', lastName: 'Grabowski', address: 'ul. Floriańska 3', city: 'Kraków', postalCode: '31-019', phone: '+48 12 345 6793', country: 'pl', lat: 50.0567, lng: 19.9369 },

  // Wrocław
  { firstName: 'Barbara', lastName: 'Szymańska', address: 'ul. Oławska 2', city: 'Wrocław', postalCode: '50-123', phone: '+48 12 345 6794', country: 'pl', lat: 51.1079, lng: 17.0385 },
  { firstName: 'Marek', lastName: 'Dąbrowski', address: 'Plac Solny 4', city: 'Wrocław', postalCode: '50-062', phone: '+48 12 345 6795', country: 'pl', lat: 51.1106, lng: 17.0328 },

  // CZECHY
  // Praga
  { firstName: 'Jiří', lastName: 'Svoboda', address: 'Nerudova 220', city: 'Praha', postalCode: '118 00', phone: '+420 224 315 737', country: 'cz', lat: 50.0861, lng: 14.4069 },
  { firstName: 'Helena', lastName: 'Černá', address: 'Celetná ulice 14', city: 'Praha', postalCode: '110 00', phone: '+420 222 220 322', country: 'cz', lat: 50.0883, lng: 14.4256 },

  // Brno
  { firstName: 'Lukáš', lastName: 'Novotný', address: 'Náměstí Svobody 1', city: 'Brno', postalCode: '602 00', phone: '+420 542 215 000', country: 'cz', lat: 49.1922, lng: 16.6113 },

  // Ostrava
  { firstName: 'Petr', lastName: 'Dvořák', address: '28. října 2858', city: 'Ostrava', postalCode: '702 00', phone: '+420 596 110 111', country: 'cz', lat: 49.8209, lng: 18.2625 },

  // SŁOWACJA
  // Bratysława
  { firstName: 'Peter', lastName: 'Horváth', address: 'Námestie SNP 1', city: 'Bratislava', postalCode: '815 01', phone: '+421 2 5443 0806', country: 'sk', lat: 48.1486, lng: 17.1077 },
  { firstName: 'Mária', lastName: 'Kováčová', address: 'Obchodná ulica 56', city: 'Bratislava', postalCode: '811 01', phone: '+421 2 5249 0249', country: 'sk', lat: 48.1416, lng: 17.1105 },

  // Košice
  { firstName: 'Ján', lastName: 'Bodnár', address: 'Hlavná ulica 48', city: 'Košice', postalCode: '040 01', phone: '+421 55 627 55 77', country: 'sk', lat: 48.7164, lng: 21.2611 },

  // WĘGRY
  // Budapeszt
  { firstName: 'István', lastName: 'Nagy', address: 'Andrássy út 47', city: 'Budapest', postalCode: '1061', phone: '+36 1 802 5000', country: 'hu', lat: 47.5038, lng: 19.0405 },
  { firstName: 'Kata', lastName: 'Szeredi', address: 'Fő utca 12', city: 'Budapest', postalCode: '1011', phone: '+36 1 487 9200', country: 'hu', lat: 47.4979, lng: 19.0402 },

  // Debrecen
  { firstName: 'Róbert', lastName: 'Molnár', address: 'Piac utca 20', city: 'Debrecen', postalCode: '4026', phone: '+36 52 511 777', country: 'hu', lat: 47.5316, lng: 21.6273 },

  // NIEMCY
  // Berlin
  { firstName: 'Klaus', lastName: 'Müller', address: 'Kurfürstendamm 26', city: 'Berlin', postalCode: '10719', phone: '+49 30 88 67 88 67', country: 'de', lat: 52.5020, lng: 13.3325 },
  { firstName: 'Stefanie', lastName: 'Schmidt', address: 'Unter den Linden 42', city: 'Berlin', postalCode: '10117', phone: '+49 30 22 60 96 0', country: 'de', lat: 52.5170, lng: 13.3915 },

  // Wrocław (blisko granicy - można testować trans-granicze)
  { firstName: 'Hans', lastName: 'Weber', address: 'Königstrasse 15', city: 'Dresden', postalCode: '01097', phone: '+49 351 8000', country: 'de', lat: 51.0504, lng: 13.7373 },
];

async function seed() {
  try {
    await connectDB();
    console.log('✓ MongoDB połączone');

    // Znajdź istniejącego użytkownika test@test.pl
    const user = await User.findOne({ email: 'test@test.pl' });
    if (!user) {
      console.error('❌ Nie znaleziono użytkownika test@test.pl');
      process.exit(1);
    }
    console.log(`✓ Znaleziony użytkownik: ${user.email} (${user.fullName})`);

    // Użyj companId użytkownika lub utwórz nową firmę
    let company = user.companyId ? await Company.findById(user.companyId) : null;
    if (!company) {
      company = await Company.findOne({ name: 'Test Company' });
      if (!company) {
        company = await Company.create({
          name: 'Test Company',
          slug: 'test-company',
          email: 'test@company.com',
        });
        console.log('✓ Utworzona test firma');
      }
    }

    // Utwórz kolekcję zamówień dla firmy
    const OrderModel = await getOrderModel(company._id);

    // Dodaj dummy adresy
    let created = 0;
    for (const addr of DUMMY_ADDRESSES) {
      const existingOrder = await OrderModel.findOne({
        userId: user._id,
        address: addr.address,
        city: addr.city,
      });

      if (!existingOrder) {
        await OrderModel.create({
          userId: user._id,
          companyId: company._id,
          title: `Dostawa dla ${addr.firstName} ${addr.lastName}`,
          firstName: addr.firstName,
          lastName: addr.lastName,
          phone: addr.phone,
          address: addr.address,
          city: addr.city,
          postalCode: addr.postalCode,
          country: addr.country || 'pl',
          details: 'Dummy zamówienie do testów',
          amount: Math.floor(Math.random() * 1000) + 100,
          status: ['nowe', 'w_trakcie', 'w_trasie', 'dostarczone', 'anulowane'][Math.floor(Math.random() * 5)],
          deliveryDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
          location: {
            type: 'Point',
            coordinates: [addr.lng, addr.lat],
          },
        });
        created++;
      }
    }

    console.log(`✓ Dodano ${created} dummy adresów`);
    console.log(`\n📍 Adresy są dostępne dla użytkownika: test@test.pl`);
    console.log(`🏢 Firma: ${company.name}`);
    console.log(`📊 Razem adresów w bazie: ${await OrderModel.countDocuments({ userId: user._id })}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Błąd:', err.message);
    process.exit(1);
  }
}

seed();
