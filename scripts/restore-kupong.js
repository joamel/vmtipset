// Hittar en kupong (söker i root kuponger/ OCH groups/joakim/kuponger/)
// och ser till att den finns i BÅDA platserna.
//
// Kör: SEARCH="Hans majestät" TARGET_GROUP=joakim node restore-kupong.js
// Kräver: FIREBASE_SERVICE_ACCOUNT env-variabel

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const SEARCH       = (process.env.SEARCH || '').toLowerCase();
const TARGET_GROUP = process.env.TARGET_GROUP || 'joakim';

if (!SEARCH) {
    console.error('Ange SEARCH=<namn> som env-variabel');
    process.exit(1);
}

async function findAndRestore() {
    console.log(`\nSöker efter "${SEARCH}" ...\n`);

    // ── Sök i root kuponger/ ──────────────────────────────────────────────────
    const rootSnap = await db.collection('kuponger').get();
    const rootHits = rootSnap.docs.filter(d => {
        const data = d.data();
        return (data.namn || data.label || '').toLowerCase().includes(SEARCH);
    });

    // ── Sök i groups/TARGET_GROUP/kuponger/ ───────────────────────────────────
    const groupSnap = await db.collection('groups').doc(TARGET_GROUP).collection('kuponger').get();
    const groupHits = groupSnap.docs.filter(d => {
        const data = d.data();
        return (data.namn || data.label || '').toLowerCase().includes(SEARCH);
    });

    console.log(`Root  kuponger/                     : ${rootHits.length} träff(ar)`);
    console.log(`Group groups/${TARGET_GROUP}/kuponger/ : ${groupHits.length} träff(ar)\n`);

    if (!rootHits.length && !groupHits.length) {
        console.log('Hittades inte i någon samling. Kontrollera stavningen.');
        return;
    }

    // ── Kopiera root → group om den saknas i group ────────────────────────────
    for (const doc of rootHits) {
        const alreadyInGroup = groupHits.some(g => g.id === doc.id);
        if (!alreadyInGroup) {
            await db.collection('groups').doc(TARGET_GROUP).collection('kuponger').doc(doc.id).set(doc.data());
            console.log(`✓ Kopierade "${doc.data().namn || doc.data().label}" (${doc.id}) → groups/${TARGET_GROUP}/kuponger/`);
        } else {
            console.log(`  "${doc.data().namn || doc.data().label}" (${doc.id}) finns redan i groups/${TARGET_GROUP}/kuponger/`);
        }
    }

    // ── Kopiera group → root om den saknas i root ─────────────────────────────
    for (const doc of groupHits) {
        const alreadyInRoot = rootHits.some(r => r.id === doc.id);
        if (!alreadyInRoot) {
            await db.collection('kuponger').doc(doc.id).set(doc.data());
            console.log(`✓ Kopierade "${doc.data().namn || doc.data().label}" (${doc.id}) → root kuponger/`);
        }
    }

    console.log('\nKlart!');
}

findAndRestore()
    .catch(e => { console.error('\nFel:', e.message); process.exit(1); })
    .finally(() => process.exit(0));
