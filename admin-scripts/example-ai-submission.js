const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// REMPLACE LA CLÉ CI-DESSOUS
const genAI = new GoogleGenerativeAI("COLLE_TA_CLE_API_GEMINI_ICI");

async function runAgent() {
  try {
    console.log("🔍 Étape 1 : Le script mémorise tes lieux existants...");
    const snapshot = await db.collection('locationContent').get();
    const existingNames = [];
    snapshot.forEach(doc => {
      if (doc.data().name) existingNames.push(doc.data().name);
    });

    console.log("🤖 Étape 2 : L'IA génère 5 propositions pour BTS...");
    const prompt = `
    Trouve 5 lieux réels, différents et emblématiques liés à BTS.
    Renvoie UNIQUEMENT un tableau JSON (array) valide contenant 5 objets, avec cette structure exacte :
    [
      {
        "name": "Nom du lieu",
        "artist": "BTS",
        "country": "Pays",
        "city": "Ville",
        "type": "Cafe ou Restaurant ou Monument",
        "year": "Année",
        "lat": 0.0,
        "lng": 0.0,
        "fullDescription": { "en": "<p>Description</p>" },
        "source": "https://lien.com"
      }
    ]`;

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const locations = JSON.parse(text);

    console.log("🛡️ Étape 3 : Le script filtre les doublons...");
    let addedCount = 0;

    for (const loc of locations) {
      const locNameLower = loc.name.toLowerCase();
      // Le code vérifie s'il y a des mots en commun pour bloquer les variantes
      const isDuplicate = existingNames.some(existing => 
        existing.includes(locNameLower) || locNameLower.includes(existing)
      );

      if (isDuplicate) {
        console.log(`🚫 Bloqué (Doublon) : ${loc.name}`);
      } else {
        await db.collection('locationSubmissions').add({
          ...loc,
          status: 'pending',
          submittedAt: admin.firestore.FieldValue.serverTimestamp(),
          submittedBy: 'Gemini-AI-Agent'
        });
        console.log(`✅ Ajouté à la file : ${loc.name}`);
        addedCount++;
      }
    }

    console.log(`🎉 Terminé ! ${addedCount} nouveaux lieux t'attendent sur admin.html.`);
  } catch (error) {
    console.error("❌ Erreur :", error);
  }
}

runAgent();
