require('dotenv').config(); // Va chercher la clé dans ton fichier .env
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// L'agent utilise la variable sécurisée, ta vraie clé n'est plus écrite ici !
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runAgent() {
  try {
    console.log("🔍 Mémorisation de tes lieux...");
    const snapshot = await db.collection('locationContent').get();
    const existingNames = [];
    snapshot.forEach(doc => {
      if (doc.data().name) existingNames.push(doc.data().name.toLowerCase());
    });

    console.log("🤖 L'IA génère 5 propositions pour BTS...");
    const prompt = `Trouve 5 lieux réels, différents et emblématiques liés à BTS.
    Renvoie UNIQUEMENT un tableau JSON (array) valide contenant 5 objets avec cette structure exacte :
    [{ "name": "Nom du lieu", "artist": "BTS", "country": "Pays", "city": "Ville", "type": "Type", "year": "Année", "lat": 0.0, "lng": 0.0, "fullDescription": { "en": "<p>Description</p>" }, "source": "https://lien.com" }]`;

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const locations = JSON.parse(text);

    console.log("🛡️ Filtrage strict des doublons...");
    let addedCount = 0;

    for (const loc of locations) {
      // On extrait les mots de plus de 3 lettres du lieu proposé
      const proposedWords = loc.name.toLowerCase().match(/\b\w{4,}\b/g) || [];
      
      // On vérifie si au moins 2 de ces mots existent dans un de tes lieux
      const isDuplicate = existingNames.some(existingName => {
        const matches = proposedWords.filter(word => existingName.includes(word));
        return matches.length >= 2;
      });

      if (isDuplicate) {
        console.log(`🚫 Bloqué (Doublon détecté) : ${loc.name}`);
      } else {
        await db.collection('locationSubmissions').add({
          ...loc, status: 'pending', submittedAt: admin.firestore.FieldValue.serverTimestamp(), submittedBy: 'Gemini-AI-Agent'
        });
        console.log(`✅ Ajouté à la file : ${loc.name}`);
        addedCount++;
      }
    }
    console.log(`🎉 Terminé ! ${addedCount} nouveaux lieux sur admin.html.`);
  } catch (error) {
    console.error("❌ Erreur :", error);
  }
}

runAgent();
