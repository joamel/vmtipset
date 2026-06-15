const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const M = [
    {h:"Mexiko",b:"Sydafrika"},{h:"Sydkorea",b:"Tjeckien"},
    {h:"Kanada",b:"Bosnien och Hercegovina"},{h:"USA",b:"Paraguay"},
    {h:"Qatar",b:"Schweiz"},{h:"Brasilien",b:"Marocko"},
    {h:"Haiti",b:"Skottland"},{h:"Australien",b:"Turkiet"},
    {h:"Tyskland",b:"Curaçao"},{h:"Nederländerna",b:"Japan"},
    {h:"Elfenbenskusten",b:"Ecuador"},{h:"Sverige",b:"Tunisien"},
    {h:"Spanien",b:"Kap Verde"},{h:"Belgien",b:"Egypten"},
    {h:"Saudiarabien",b:"Uruguay"},{h:"Iran",b:"Nya Zeeland"},
    {h:"Frankrike",b:"Senegal"},{h:"Irak",b:"Norge"},
    {h:"Argentina",b:"Algeriet"},{h:"Österrike",b:"Jordanien"},
    {h:"Portugal",b:"DR Kongo"},{h:"England",b:"Kroatien"},
    {h:"Ghana",b:"Panama"},{h:"Uzbekistan",b:"Colombia"},
    {h:"Tjeckien",b:"Sydafrika"},{h:"Schweiz",b:"Bosnien och Hercegovina"},
    {h:"Kanada",b:"Qatar"},{h:"Mexiko",b:"Sydkorea"},
    {h:"USA",b:"Australien"},{h:"Skottland",b:"Marocko"},
    {h:"Brasilien",b:"Haiti"},{h:"Turkiet",b:"Paraguay"},
    {h:"Nederländerna",b:"Sverige"},{h:"Tyskland",b:"Elfenbenskusten"},
    {h:"Ecuador",b:"Curaçao"},{h:"Tunisien",b:"Japan"},
    {h:"Spanien",b:"Saudiarabien"},{h:"Belgien",b:"Iran"},
    {h:"Uruguay",b:"Kap Verde"},{h:"Nya Zeeland",b:"Egypten"},
    {h:"Argentina",b:"Österrike"},{h:"Frankrike",b:"Irak"},
    {h:"Norge",b:"Senegal"},{h:"Jordanien",b:"Algeriet"},
    {h:"Portugal",b:"Uzbekistan"},{h:"England",b:"Ghana"},
    {h:"Panama",b:"Kroatien"},{h:"Colombia",b:"DR Kongo"},
    {h:"Schweiz",b:"Kanada"},{h:"Bosnien och Hercegovina",b:"Qatar"},
    {h:"Skottland",b:"Brasilien"},{h:"Marocko",b:"Haiti"},
    {h:"Tjeckien",b:"Mexiko"},{h:"Sydafrika",b:"Sydkorea"},
    {h:"Curaçao",b:"Elfenbenskusten"},{h:"Ecuador",b:"Tyskland"},
    {h:"Japan",b:"Sverige"},{h:"Tunisien",b:"Nederländerna"},
    {h:"Turkiet",b:"USA"},{h:"Paraguay",b:"Australien"},
    {h:"Norge",b:"Frankrike"},{h:"Senegal",b:"Irak"},
    {h:"Kap Verde",b:"Saudiarabien"},{h:"Uruguay",b:"Spanien"},
    {h:"Egypten",b:"Iran"},{h:"Nya Zeeland",b:"Belgien"},
    {h:"Panama",b:"England"},{h:"Kroatien",b:"Ghana"},
    {h:"Colombia",b:"Portugal"},{h:"DR Kongo",b:"Uzbekistan"},
    {h:"Algeriet",b:"Österrike"},{h:"Jordanien",b:"Argentina"},
];

const TEAM_EN = {
    'mexiko':['mexico'],'sydafrika':['south africa'],'sydkorea':['korea republic','south korea'],
    'tjeckien':['czechia','czech republic'],'kanada':['canada'],
    'bosnien och hercegovina':['bosnia and herzegovina','bosnia-herzegovina','bosnia & herzegovina'],
    'usa':['united states','usa'],'paraguay':['paraguay'],'qatar':['qatar'],
    'schweiz':['switzerland'],'brasilien':['brazil'],'marocko':['morocco'],
    'haiti':['haiti'],'skottland':['scotland'],'australien':['australia'],
    'turkiet':['türkiye','turkey'],'tyskland':['germany'],'curaçao':['curaçao','curacao'],
    'nederländerna':['netherlands'],'japan':['japan'],
    "elfenbenskusten":["côte d'ivoire","ivory coast","cote d'ivoire"],
    'ecuador':['ecuador'],'sverige':['sweden'],'tunisien':['tunisia'],
    'spanien':['spain'],'kap verde':['cape verde','cabo verde','cape verde islands'],
    'belgien':['belgium'],'egypten':['egypt'],'saudiarabien':['saudi arabia'],
    'uruguay':['uruguay'],'iran':['iran'],'nya zeeland':['new zealand'],
    'frankrike':['france'],'senegal':['senegal'],'irak':['iraq'],
    'norge':['norway'],'argentina':['argentina'],'algeriet':['algeria'],
    'österrike':['austria'],'jordanien':['jordan'],'portugal':['portugal'],
    'dr kongo':['dr congo','congo dr','democratic republic of congo'],
    'england':['england'],'kroatien':['croatia'],'ghana':['ghana'],
    'panama':['panama'],'uzbekistan':['uzbekistan'],'colombia':['colombia'],
};

const norm = s => (s || '').toLowerCase().replace(/[^a-z]/g, '');

function teamMatches(apiName, swe) {
    if (!apiName || !swe) return false;
    const aliases = TEAM_EN[swe.toLowerCase()];
    if (!aliases) return false;
    return aliases.some(a => norm(a) === norm(apiName));
}

function mapApiToResults(apiMatches) {
    const results = new Array(M.length).fill(null);
    const unmatched = [];
    apiMatches.forEach(am => {
        const idx = M.findIndex(m => teamMatches(am.homeTeam?.name, m.h) && teamMatches(am.awayTeam?.name, m.b));
        if (idx === -1) {
            if (am.homeTeam?.name) unmatched.push(`${am.homeTeam.name} v ${am.awayTeam?.name}`);
            return;
        }
        results[idx] = { h: am.score.fullTime.home, a: am.score.fullTime.away, status: am.status };
    });
    if (unmatched.length) console.warn('Omatchade:', unmatched.join(', '));
    return results;
}

async function main() {
    const resp = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
        headers: { 'X-Auth-Token': process.env.FD_API_KEY }
    });
    if (!resp.ok) {
        console.error('API-fel:', resp.status, await resp.text());
        process.exit(1);
    }
    const data = await resp.json();
    const results = mapApiToResults(data.matches || []);
    const updatedAt = new Date().toISOString();
    await db.collection('meta').doc('results').set({ results, updatedAt });
    const n = results.filter(r => r?.status === 'FINISHED').length;
    console.log(`✓ ${n} avslutade matcher sparade (${updatedAt})`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => process.exit(0));
