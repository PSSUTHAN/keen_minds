from typing import Dict, Any

# Prompts and voice TTS configurations for English, Hindi, and Tamil
SPEECH_PROMPTS = {
    "en": {
        "welcome": "Welcome to MediKiosk. Please register or scan your ABHA ID to begin.",
        "consent": "Please review the consent form. Your medical information will be shared securely with your doctor.",
        "chief_complaint": "What is the main health problem bringing you to the hospital today?",
        "hpi": "How long have you had this issue, and how severe is the discomfort?",
        "past_medical": "Do you have any ongoing medical conditions like Diabetes, Hypertension, or Thyroid?",
        "medications": "What medications are you currently taking daily?",
        "allergies": "Do you have any known allergies to drugs or food?",
        "family_history": "Does anyone in your immediate family have Heart Disease, Cancer, or Diabetes?",
        "document_upload": "Please place your prescription or lab report into the scanner or click upload.",
        "summary_ready": "Your clinical summary is ready. Please review it before meeting the doctor.",
        "emergency_alert": "Warning! Critical symptom detected. Hospital staff have been alerted immediately."
    },
    "hi": {
        "welcome": "मेडीकिओस्क में आपका स्वागत है। कृपया शुरू करने के लिए अपना पंजीकरण करें या एबीएचए आईडी स्कैन करें।",
        "consent": "कृपया सहमति पत्र की समीक्षा करें। आपकी चिकित्सा जानकारी डॉक्टर के साथ सुरक्षित रूप से साझा की जाएगी।",
        "chief_complaint": "आज आपको अस्पताल लाने वाली मुख्य स्वास्थ्य समस्या क्या है?",
        "hpi": "यह समस्या आपको कितने समय से है, और तकलीफ कितनी तेज है?",
        "past_medical": "क्या आपको मधुमेह, उच्च रक्तचाप या थायराइड जैसी कोई बीमारी है?",
        "medications": "आप वर्तमान में कौन सी दवाएं रोजाना ले रहे हैं?",
        "allergies": "क्या आपको किसी दवा या भोजन से एलर्जी है?",
        "family_history": "क्या आपके परिवार में किसी को दिल की बीमारी या मधुमेह है?",
        "document_upload": "कृपया अपना पर्चा या लैब रिपोर्ट स्कैनर में रखें या अपलोड पर क्लिक करें।",
        "summary_ready": "आपका क्लिनिकल सारांश तैयार है। डॉक्टर से मिलने से पहले कृपया इसकी समीक्षा करें।",
        "emergency_alert": "चेतावनी! गंभीर लक्षण पाए गए। अस्पताल के कर्मचारियों को तुरंत सूचित किया गया है।"
    },
    "ta": {
        "welcome": "மெடிகியோஸ்கிற்கு உங்களை வரவேற்கிறோம். தொடங்குவதற்கு உங்கள் ஆபா ஐடியை பதிவு செய்யவும் அல்லது ஸ்கேன் செய்யவும்.",
        "consent": "தயவுசெய்து ஒப்புதல் படிவத்தை சரிபார்க்கவும். உங்கள் மருத்துவ விவரங்கள் மருத்துவருடன் பாதுகாப்பாக பகிரப்படும்.",
        "chief_complaint": "இன்று உங்களை மருத்துவமனைக்கு வரவழைத்த முக்கிய உடல்நலப் பிரச்சினை என்ன?",
        "hpi": "இந்த பிரச்சனை உங்களுக்கு எவ்வளவு காலமாக உள்ளது?",
        "past_medical": "உங்களுக்கு சர்க்கரை நோய், ரத்த அழுத்தம் அல்லது தைராய்டு போன்ற நோய்கள் உள்ளதா?",
        "medications": "தற்போது தினமும் என்ன மருந்துகளை சாப்பிட்டு வருகிறீர்கள்?",
        "allergies": "உங்களுக்கு ஏதேனும் மருந்து அல்லது உணவு ஒவ்வாமை (Allergy) உள்ளதா?",
        "family_history": "உங்கள் குடும்பத்தில் யாருக்காவது இதய நோய் அல்லது சர்க்கரை நோய் உள்ளதா?",
        "document_upload": "தயவுசெய்து உங்கள் மருந்துச் சீட்டு அல்லது பரிசோதனை அறிக்கையை பதிவேற்றவும்.",
        "summary_ready": "உங்கள் மருத்துவ சுருக்கம் தயார். மருத்துவரை சந்திப்பதற்கு முன் சரிபார்க்கவும்.",
        "emergency_alert": "எச்சரிக்கை! அவசர அறிகுறி கண்டறியப்பட்டது. மருத்துவமனை ஊழியர்களுக்கு உடனடியாக தகவல் தெரிவிக்கப்பட்டுள்ளது."
    }
}

def get_tts_prompt(key: str, lang: str = "en") -> str:
    lang_prompts = SPEECH_PROMPTS.get(lang, SPEECH_PROMPTS["en"])
    return lang_prompts.get(key, SPEECH_PROMPTS["en"].get(key, ""))
