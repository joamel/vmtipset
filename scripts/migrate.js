// One-time migration: copies root kuponger + meta (tabell, links) to groups/TARGET_GROUP.
// meta/results and meta/config are NOT migrated — results are global, config stays at root
// until you manually copy/re-save the API key from the admin panel.
//
// Run: TARGET_GROUP=joakim node migrate.js
// Requires: FIREBASE_SERVICE_ACCOUNT env var (same as fetch-results.js)

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TARGET_GROUP = process.env.TARGET_GROUP || 'joakim';

async function migrate() {
    console.log(`\nMigrerar till grupp: "${TARGET_GROUP}"\n`);

    // ── kuponger ──────────────────────────────────────────────────────────────
    const kupSnap = await db.collection('kuponger').get();
    if (kupSnap.empty) {
        console.log('Inga kuponger att migrera.');
    } else {
        const batch = db.batch();
        kupSnap.docs.forEach(doc => {
            const dest = db.collection('groups').doc(TARGET_GROUP).collection('kuponger').doc(doc.id);
            batch.set(dest, doc.data());
        });
        await batch.commit();
        console.log(`✓ ${kupSnap.size} kuponger migrerade till groups/${TARGET_GROUP}/kuponger/`);
    }

    // ── meta/config (password + API key) ─────────────────────────────────────
    const cSnap = await db.collection('meta').doc('config').get();
    if (cSnap.exists) {
        await db.collection('groups').doc(TARGET_GROUP).collection('meta').doc('config').set(cSnap.data());
        console.log(`✓ meta/config migrerat (lösenord + API-nyckel)`);
    }

    // ── meta/tabell ───────────────────────────────────────────────────────────
    const tSnap = await db.collection('meta').doc('tabell').get();
    if (tSnap.exists) {
        await db.collection('groups').doc(TARGET_GROUP).collection('meta').doc('tabell').set(tSnap.data());
        console.log(`✓ meta/tabell migrerat`);
    } else {
        console.log('  meta/tabell finns inte, hoppar över.');
    }

    // ── meta/links ────────────────────────────────────────────────────────────
    const lSnap = await db.collection('meta').doc('links').get();
    if (lSnap.exists) {
        await db.collection('groups').doc(TARGET_GROUP).collection('meta').doc('links').set(lSnap.data());
        console.log(`✓ meta/links migrerat`);
    }

    console.log('\nKlart!');
    console.log('meta/results lämnades kvar (global resurs).');
    console.log('Root-datan finns kvar som backup. Ta bort den manuellt i Firebase-konsolen när du är nöjd.');
}

migrate()
    .catch(e => { console.error('\nFel:', e.message); process.exit(1); })
    .finally(() => process.exit(0));
