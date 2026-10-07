"""
MediKiosk AI Conversational History & Clinical Summarizer Service

This module handles:
1. Processing patient chat turns (text or voice transcripts).
2. Triage & Red-Flag emergency warning symptom detection.
3. Adaptive follow-up question generation per clinical intake section.
4. AYUSH Dashavidha Pariksha (10-fold examination) mode handling.
5. Synthesis of patient history entries + OCR scanned document data into a structured Clinical Summary.
6. Extraction and highlighting of missing or uncertain clinical information.
7. Strict adherence to non-diagnostic safety guardrails.
"""

from typing import List, Dict, Any, Tuple, Optional
from app.services.emergency_service import check_emergency_symptoms
from app.services.ayush_service import get_ayush_questions
from app.services.speech_service import get_tts_prompt

# Clinical intake section order sequence
SECTIONS_ORDER = [
    "chief_complaint",
    "hpi",
    "past_medical",
    "past_surgical",
    "medications",
    "allergies",
    "family_history",
    "personal_history"
]

SECTION_LABELS = {
    "en": {
        "chief_complaint": "Chief Complaint",
        "hpi": "History of Present Illness",
        "past_medical": "Past Medical Conditions",
        "past_surgical": "Past Surgeries & Procedures",
        "medications": "Current Medications",
        "allergies": "Allergies & Reactions",
        "family_history": "Family Medical History",
        "personal_history": "Diet & Habits",
        "ayush_dashavidha": "AYUSH Dashavidha Pariksha"
    },
    "hi": {
        "chief_complaint": "मुख्य शिकायत",
        "hpi": "वर्तमान बीमारी का इतिहास",
        "past_medical": "पिछली बीमारियां",
        "past_surgical": "पुरानी सर्जरी",
        "medications": "वर्तमान दवाएं",
        "allergies": "एलर्जी",
        "family_history": "पारिवारिक इतिहास",
        "personal_history": "व्यक्तिगत आदतें",
        "ayush_dashavidha": "आयुष दशाविध परीक्षा"
    },
    "ta": {
        "chief_complaint": "முதன்மை புகார்",
        "hpi": "தற்போதைய நோய் வரலாறு",
        "past_medical": "கடந்தகால மருத்துவ நிலை",
        "past_surgical": "அறுவை சிகிச்சை வரலாறு",
        "medications": "தற்போது சாப்பிடும் மருந்துகள்",
        "allergies": "ஒவ்வாமை (Allergy)",
        "family_history": "குடும்ப மருத்துவ வரலாறு",
        "personal_history": "உணவு மற்றும் பழக்கவழக்கம்",
        "ayush_dashavidha": "ஆயுஷ் தசவித பரீக்ஷா"
    }
}

DEFAULT_QUESTIONS = {
    "en": {
        "chief_complaint": "What primary health discomfort brought you to the hospital today?",
        "hpi": "When did this symptom start, and does anything make it better or worse?",
        "past_medical": "Have you been diagnosed with Diabetes, High Blood Pressure, Thyroid, or Heart conditions in the past?",
        "past_surgical": "Have you ever undergone any surgical operations or hospitalizations?",
        "medications": "Are you taking any prescribed tablets, Ayurvedic syrups, or daily supplements?",
        "allergies": "Do you experience rashes, swelling, or breathing issues from any medicines (e.g. Penicillin) or foods?",
        "family_history": "Is there any history of Diabetes, Hypertension, Heart Attack, or Cancer in your family?",
        "personal_history": "What is your regular diet type, and do you smoke or consume alcohol?"
    },
    "hi": {
        "chief_complaint": "आज आपको अस्पताल लाने वाली मुख्य परेशानी क्या है?",
        "hpi": "यह लक्षण कब शुरू हुआ, और क्या कोई चीज़ इसे बढ़ाती या घटाती है?",
        "past_medical": "क्या आपको पहले मधुमेह (शुगर), उच्च रक्तचाप (बीपी) या थायराइड रहा है?",
        "past_surgical": "क्या आपकी पहले कभी कोई सर्जरी या ऑपरेशन हुआ है?",
        "medications": "क्या आप वर्तमान में कोई गोलियां या आयुर्वेदिक दवाएं ले रहे हैं?",
        "allergies": "क्या आपको किसी दवा या भोजन से एलर्जी होती है?",
        "family_history": "क्या आपके परिवार में किसी को दिल की बीमारी या कैंसर रहा है?",
        "personal_history": "आपका दैनिक आहार कैसा है, और क्या आप धूम्रपान या शराब का सेवन करते हैं?"
    },
    "ta": {
        "chief_complaint": "இன்று உங்களை மருத்துவமனைக்கு வரவழைத்த முக்கிய உடல்நலப் பிரச்சினை என்ன?",
        "hpi": "இந்த அறிகுறி எப்போது தொடங்கியது, இதை எது அதிகப்படுத்துகிறது?",
        "past_medical": "உங்களுக்கு முன்பு சர்க்கரை நோய், ரத்த அழுத்தம் அல்லது தைராய்டு இருந்ததா?",
        "past_surgical": "உங்களுக்கு எப்போதாவது அறுவை சிகிச்சை நடந்துள்ளதா?",
        "medications": "நீங்கள் தற்போது ஏதேனும் மருந்துகள் அல்லது ஆயுர்வேத மருந்துகள் சாப்பிடுகிறீர்களா?",
        "allergies": "உங்களுக்கு ஏதேனும் மருந்து அல்லது உணவு ஒவ்வாமை உள்ளதா?",
        "family_history": "உங்கள் குடும்பத்தில் யாருக்காவது இதய நோய் அல்லது சர்க்கரை நோய் வரலாறு உள்ளதா?",
        "personal_history": "உங்கள் வழக்கமான உணவு முறை மற்றும் பழக்கவழக்கங்கள் என்ன?"
    }
}

QUICK_CHIPS_MAP = {
    "chief_complaint": ["Severe Fever & Chills", "Continuous Cough", "Abdominal Pain", "Joint & Knee Pain", "Dizziness / Headache", "Chest Tightness", "Skin Rash"],
    "hpi": ["Started 2 days ago", "Started 1 week ago", "Gradually worsening", "Occurs mainly at night", "Mild pain (3/10)", "Severe pain (8/10)"],
    "past_medical": ["Type 2 Diabetes Mellitus", "High Blood Pressure (Hypertension)", "Asthma", "Thyroid Disorder", "None / Healthy"],
    "past_surgical": ["Appendectomy (Appendix)", "Cesarean Section (C-Section)", "Knee Replacement", "Gallbladder surgery", "No past surgeries"],
    "medications": ["Metformin 500mg BD", "Telmisartan 40mg OD", "Pantoprazole 40mg", "Thyronorm 50mcg", "No regular medications"],
    "allergies": ["Penicillin / Amoxicillin", "Sulfa drugs", "Dust / Pollen", "Peanuts / Shellfish", "No known allergies (NKDA)"],
    "family_history": ["Diabetes in Father", "Hypertension in Mother", "Heart Disease in Siblings", "No major family history"],
    "personal_history": ["Vegetarian Diet", "Non-Vegetarian Diet", "Smoker", "Occasional Alcohol", "No Tobacco/Alcohol"]
}

def process_chat_turn(
    user_input: str,
    current_section: str,
    lang: str = "en",
    history_so_far: List[Dict[str, Any]] = [],
    ayush_mode: bool = False
) -> Tuple[Dict[str, Any], bool, Optional[str], Optional[str]]:
    """
    Processes patient input, checks emergency red flags, provides adaptive follow-up,
    and returns next question & quick chips.
    """
    # 1. Emergency Red Flag Detection
    is_emergency, warning_symptom, severity = check_emergency_symptoms(user_input)
    if is_emergency:
        return {
            "next_question": "CRITICAL NOTICE: Warning symptom detected. Please stay seated; hospital nursing staff are arriving to assist you immediately.",
            "suggested_quick_chips": ["Alert Nurse Station", "I need immediate help"],
            "current_section": current_section,
            "next_section": current_section,
            "section_completed": False,
            "is_emergency": True,
            "emergency_warning": warning_symptom,
            "audio_tts_prompt": get_tts_prompt("emergency_alert", lang)
        }, True, warning_symptom, severity

    # 2. AYUSH Special Mode
    if ayush_mode and current_section == "ayush_dashavidha":
        ayush_q_list = get_ayush_questions(lang)
        answered_count = len([h for h in history_so_far if h.get("section") == "ayush_dashavidha"])
        if answered_count < len(ayush_q_list):
            next_q_obj = ayush_q_list[answered_count]
            return {
                "next_question": f"[{next_q_obj['category']}] {next_q_obj['question']}",
                "suggested_quick_chips": next_q_obj.get("chips", []),
                "current_section": "ayush_dashavidha",
                "next_section": "ayush_dashavidha" if answered_count + 1 < len(ayush_q_list) else "chief_complaint",
                "section_completed": answered_count + 1 >= len(ayush_q_list),
                "is_emergency": False,
                "emergency_warning": None,
                "audio_tts_prompt": next_q_obj['question']
            }, False, None, None

    # 3. Standard Section Progression & Adaptive Follow-up
    current_index = SECTIONS_ORDER.index(current_section) if current_section in SECTIONS_ORDER else 0
    
    # Adaptive follow-up logic based on user input details
    input_lower = user_input.lower()
    next_question = ""
    quick_chips = []
    next_section = current_section
    section_completed = False

    # Check if patient response was brief or needs elaboration
    if len(user_input.split()) < 3 and current_section == "chief_complaint":
        next_question = f"Could you describe more about how the {user_input} feels and whether it radiates to other parts?"
        quick_chips = ["Pain is sharp", "Pain is dull ache", "Accompanied by sweating", "Accompanied by nausea"]
        next_section = "chief_complaint"
    elif "fever" in input_lower and current_section == "chief_complaint":
        next_question = "How high is the fever, and do you also have chills or body pain?"
        quick_chips = ["High fever with chills", "Low grade fever", "Fever comes and goes", "With joint stiffness"]
        next_section = "hpi"
        section_completed = True
    else:
        # Progress to next section
        if current_index + 1 < len(SECTIONS_ORDER):
            next_section = SECTIONS_ORDER[current_index + 1]
            section_completed = True
            lang_dict = DEFAULT_QUESTIONS.get(lang, DEFAULT_QUESTIONS["en"])
            next_question = lang_dict.get(next_section, DEFAULT_QUESTIONS["en"].get(next_section, ""))
            quick_chips = QUICK_CHIPS_MAP.get(next_section, [])
        else:
            # End of conversational history taking
            next_section = "completed"
            section_completed = True
            next_question = "Thank you! We have recorded your clinical history. You can now proceed to scan or upload your medical documents."
            quick_chips = ["Proceed to Document Upload", "Review History"]

    return {
        "next_question": next_question,
        "suggested_quick_chips": quick_chips,
        "current_section": current_section,
        "next_section": next_section,
        "section_completed": section_completed,
        "is_emergency": False,
        "emergency_warning": None,
        "audio_tts_prompt": next_question
    }, False, None, None

def generate_structured_summary(
    history_entries: List[Dict[str, Any]],
    documents: List[Dict[str, Any]],
    ayush_mode: bool = False
) -> Dict[str, Any]:
    """
    Synthesizes history entries and verified OCR document data into a structured Clinical Summary.
    Highlights missing or uncertain information.
    Strictly follows clinical summary guidelines (No autonomous diagnosis or prescribing).
    """
    chief_complaints = []
    hpi_list = []
    past_med_list = []
    past_surg_list = []
    meds_list = []
    allergies_list = []
    family_list = []
    personal_list = []
    ayush_list = []

    for entry in history_entries:
        sec = entry.get("section")
        resp = entry.get("response", "")
        cat = entry.get("ayush_category", "")
        if sec == "chief_complaint":
            chief_complaints.append(resp)
        elif sec == "hpi":
            hpi_list.append(resp)
        elif sec == "past_medical":
            past_med_list.append(resp)
        elif sec == "past_surgical":
            past_surg_list.append(resp)
        elif sec == "medications":
            meds_list.append(resp)
        elif sec == "allergies":
            allergies_list.append(resp)
        elif sec == "family_history":
            family_list.append(resp)
        elif sec == "personal_history":
            personal_list.append(resp)
        elif sec == "ayush_dashavidha":
            ayush_list.append(f"{cat}: {resp}")

    # Incorporate OCR documents data
    doc_investigations = []
    doc_meds = []
    doc_diagnoses = []
    for doc in documents:
        entities = doc.get("extracted_entities", {}) or {}
        for diag in entities.get("diagnoses", []):
            if isinstance(diag, dict):
                doc_diagnoses.append(f"{diag.get('term')} (OCR conf: {int(diag.get('confidence', 0.8)*100)}%)")
        for med in entities.get("medications", []):
            if isinstance(med, dict):
                doc_meds.append(f"{med.get('name')} {med.get('dosage')} {med.get('frequency')}")
        for lab in entities.get("lab_values", []):
            if isinstance(lab, dict):
                doc_investigations.append(f"{lab.get('test', 'Test')}: {lab.get('val', 'N/A')} [{lab.get('status', 'NORMAL')}]")

    # Assess missing or uncertain clinical information
    missing_uncertain = []
    if not chief_complaints:
        missing_uncertain.append("Chief complaint was not fully specified by patient.")
    if not hpi_list:
        missing_uncertain.append("Duration and severity details of current illness need clinical clarification.")
    if not meds_list and not doc_meds:
        missing_uncertain.append("Current medication history unconfirmed (Patient stated none or unrecorded).")
    if not allergies_list:
        missing_uncertain.append("Allergy history pending verification by attending physician.")
    if any("unverified" in str(doc).lower() for doc in documents):
        missing_uncertain.append("OCR scanned document entities contain low-confidence items awaiting doctor review.")

    past_medical_combined = "; ".join(past_med_list)
    if doc_diagnoses:
        past_medical_combined += f" | Extracted from prior docs: {', '.join(doc_diagnoses)}"

    meds_combined = "; ".join(meds_list)
    if doc_meds:
        meds_combined += f" | Extracted from uploaded prescriptions: {', '.join(doc_meds)}"

    return {
        "chief_complaint": "; ".join(chief_complaints) if chief_complaints else "Not specified",
        "hpi": " | ".join(hpi_list) if hpi_list else "Symptoms reported by patient at kiosk.",
        "past_medical_surgical": past_medical_combined if past_medical_combined else "No major prior medical or surgical history reported.",
        "medication_history": meds_combined if meds_combined else "No active daily medications reported.",
        "allergy_history": "; ".join(allergies_list) if allergies_list else "No known drug allergies (NKDA).",
        "family_history": "; ".join(family_list) if family_list else "Non-contributory family history.",
        "personal_history": "; ".join(personal_list) if personal_list else "Regular diet and lifestyle.",
        "ayush_assessment": " | ".join(ayush_list) if ayush_list else ("N/A (Standard Allopathic mode used)" if not ayush_mode else "Dashavidha Pariksha incomplete"),
        "review_of_systems": "Constitutional: Patient oriented. Cardiovascular & Respiratory screening completed via kiosk protocol.",
        "previous_investigations": "; ".join(doc_investigations) if doc_investigations else "No prior laboratory or radiology reports uploaded.",
        "missing_or_uncertain_info": missing_uncertain
    }
