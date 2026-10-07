from typing import Dict, List, Any

# AYUSH Dashavidha Pariksha (10-Fold Assessment Framework for Indian Hospitals)
DASHAVIDHA_PARIKSHA_QUESTIONS = {
    "en": [
        {"category": "Dushyam", "question": "What primary body tissues or humors feel affected? (e.g. joints, digestion, skin, nervous system)", "chips": ["Joints & Bones", "Digestive system", "Respiratory", "Skin / Blood", "Nerves / Sleep"]},
        {"category": "Desham", "question": "What is your living environment & climate? (e.g., humid, dry, hilly, coastal)", "chips": ["Hot & Humid", "Dry & Dusty", "Urban / Polluted", "Coastal", "Hilly / Cold"]},
        {"category": "Balam", "question": "How would you rate your physical stamina and mental energy levels?", "chips": ["High / Good stamina", "Moderate strength", "Weak / Low stamina", "Easily fatigued"]},
        {"category": "Kalam", "question": "Which season, weather, or time of day makes your symptoms worse?", "chips": ["Morning / Cold", "Afternoon / Sun", "Night / Evening", "Monsoon / Rainy", "Winter / Frost"]},
        {"category": "Analam", "question": "How is your digestive fire (Agni)? (e.g., strong, weak, erratic, burning)", "chips": ["Strong Digestion (Tikshnagni)", "Weak Digestion (Mandagni)", "Irregular Digestion (Vishamagni)", "Balanced (Samagni)"]},
        {"category": "Prakriti", "question": "What is your dominant body constitution type (Prakriti)?", "chips": ["Vata (Dry/Airy)", "Pitta (Warm/Fiery)", "Kapha (Heavy/Moist)", "Vata-Pitta", "Unsure / Need Doctor Assessment"]},
        {"category": "Vayas", "question": "What age group category do you fall into?", "chips": ["Childhood (Balyavastha)", "Youth (Yauvanavastha)", "Elderly (Vardhakya)"]},
        {"category": "Sattvam", "question": "How is your mental tolerance and stress handling capacity?", "chips": ["Pravara (Strong mental resilience)", "Madhya (Moderate resilience)", "Avara (Low resilience / Anxious)"]},
        {"category": "Satmyam", "question": "What foods or climate habits suit your body well without causing illness?", "chips": ["Warm cooked food", "Cooling food / Milk", "Spicy food", "Light soups", "Ghee / Oils"]},
        {"category": "Aharam", "question": "What is your usual diet quality and bowel movement consistency?", "chips": ["Vegetarian - Regular bowels", "Non-veg - Regular bowels", "Constipated / Irregular", "Acidic / Bloating"]}
    ],
    "hi": [
        {"category": "Dushyam", "question": "आपके शरीर के किस हिस्से या धातु में परेशानी महसूस हो रही है?", "chips": ["जोड़ों और हड्डियों में", "पाचन तंत्र", "सांस की नली", "त्वचा / रक्त", "तंत्रिका / नींद"]},
        {"category": "Desham", "question": "आपका निवास स्थान और जलवायु कैसी है?", "chips": ["गर्म और आर्द्र", "सूखा और धूल भरा", "शहरी / प्रदूषित", "तटीय इलाका", "पहाड़ी / ठंडा"]},
        {"category": "Balam", "question": "आपकी शारीरिक शक्ति और मानसिक ऊर्जा कैसी है?", "chips": ["अच्छी ताकत", "सामान्य शक्ति", "कमजोर / कम ताकत", "जल्दी थकान"]},
        {"category": "Analam", "question": "आपकी पाचन अग्नि (अग्नि) कैसी है?", "chips": ["तीव्र अग्नि (तेज भूख)", "मंद अग्नि (कम भूख)", "विषम अग्नि (अनियमित)", "सम अग्नि (संतुलित)"]},
        {"category": "Prakriti", "question": "आपकी शारीरिक प्रकृति कौन सी है?", "chips": ["वात (वायु)", "पित्त (अग्नि)", "कफ (जल)", "वात-पित्त", "पता नहीं"]}
    ],
    "ta": [
        {"category": "Dushyam", "question": "உடலின் எந்த பகுதி அல்லது தாது பாதிக்கப்பட்டுள்ளதாக உணர்கிறீர்கள்?", "chips": ["மூட்டுகள் & எலும்புகள்", "செரிமான மண்டலம்", "சுவாச மண்டலம்", "தோல் / ரத்தம்", "நரம்பு / தூக்கம்"]},
        {"category": "Analam", "question": "உங்கள் செரிமானத் திறன் (அக்னி) எப்படி உள்ளது?", "chips": ["நல்ல பசி (தீக்ஷ்ணாக்னி)", "குறைந்த பசி (மந்தாக்னி)", "மாறுபடும் பசி", "சீரான பசி"]},
        {"category": "Prakriti", "question": "உங்கள் உடலின் இயல்புத்தன்மை (பிரகிருதி) எது?", "chips": ["வாதம்", "பித்தம்", "கபம்", "வாதா-பித்தம்", "தெரியவில்லை"]}
    ]
}

def get_ayush_questions(lang: str = "en") -> List[Dict[str, Any]]:
    return DASHAVIDHA_PARIKSHA_QUESTIONS.get(lang, DASHAVIDHA_PARIKSHA_QUESTIONS["en"])
