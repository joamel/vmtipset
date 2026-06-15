// Kopierar kuponger (och meta) från groups/TARGET_GROUP/ tillbaka till rotnivån.
// Använd detta om du vill återgå till den gamla strukturen.
//
// Kör: TARGET_GROUP=joakim node copy-to-root.js
// Kräver: FIREBASE_SERVICE_ACCOUNT env-variabel (service account JSON)

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const SOURCE_GROUP = process.env.TARGET_GROUP || 'joakim';

async function copyToRoot() {
    console.log(`\nKopierar från grupp "${SOURCE_GROUP}" till rotnivån...\n`);

    // ── kuponger ──────────────────────────────────────────────────────────────
    const kupSnap = await db.collection('groups').doc(SOURCE_GROUP).collection('kuponger').get();
    if (kupSnap.empty) {
        console.log(`Inga kuponger i groups/${SOURCE_GROUP}/kuponger/`);
    } else {
        const batch = db.batch();
        kupSnap.docs.forEach(doc => {
            const dest = db.collection('kuponger').doc(doc.id);
            batch.set(dest, doc.data());
        });
        await batch.commit();
        console.log(`✓ ${kupSnap.size} kuponger kopierade till root kuponger/`);
    }

    // ── meta/config ───────────────────────────────────────────────────────────
    const cSnap = await db.collection('groups').doc(SOURCE_GROUP).collection('meta').doc('config').get();
    if (cSnap.exists) {
        await db.collection('meta').doc('config').set(cSnap.data(), { merge: true });
        console.log(`✓ meta/config kopierat (lösenord + API-nyckel)`);
    }

    // ── meta/tabell ───────────────────────────────────────────────────────────
    const tSnap = await db.collection('groups').doc(SOURCE_GROUP).collection('meta').doc('tabell').get();
    if (tSnap.exists) {
        await db.collection('meta').doc('tabell').set(tSnap.data());
        console.log(`✓ meta/tabell kopierat`);
    }

    console.log('\nKlart! Root-data uppdaterad.');
}

copyToRoot()
    .catch(e => { console.error('\nFel:', e.message); process.exit(1); })
    .finally(() => process.exit(0));
