import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';

const PattayaAreas = [
  "Central Pattaya", "Jomtien", "Naklua", "Pratumnak", "Wongamat", 
  "North Pattaya", "South Pattaya", "East Pattaya", "Bang Saray", 
  "Na Jomtien", "Huai Yai", "Bang Lamung", "Sattahip"
];

export async function seedLocations() {
  console.log("Seeding locations...");
  for (const area of PattayaAreas) {
    const slug = area.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(db, 'locations', slug);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        slug,
        status: 'draft',
        displayOrder: PattayaAreas.indexOf(area),
        heroImage: '',
        mapEmbedUrl: '',
        translations: {
          en: { name: area }
        },
        nearbyAreas: [],
        featuredCarIds: [],
        seo: { metaTitle: `${area} Car Rental - Pattaya Rent A Car` },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`Seeded ${area}`);
    }
  }
  console.log("Seeding complete.");
}
