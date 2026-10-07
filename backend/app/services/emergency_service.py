import re
from typing import Optional, Dict, Tuple

# Red-flag emergency symptoms list according to clinical triage guidelines
EMERGENCY_KEYWORDS = [
    # Cardiac / Chest pain
    (r"chest pain|heavy chest|tightness in chest|pain radiating to arm|jaw pain|நெஞ்சு வலி|सीने में दर्द|छाती में दर्द", "Chest Pain / Suspected Acute Coronary Syndrome", "CRITICAL"),
    # Respiratory distress
    (r"breathless|cannot breathe|gasping|severe shortness of breath|மூச்சு திணறல்|सांस फूलना|सांस लेने में तकलीफ", "Severe Respiratory Distress", "CRITICAL"),
    # Stroke symptoms
    (r"face drooping|arm weakness|slurred speech|sudden numbness|ஒன்றிய பக்கம் பலவீனம்|चेहरे पर लकवा|बोलने में तकलीफ", "Suspected Acute Stroke (FAST signs)", "CRITICAL"),
    # Neurological / Consciousness
    (r"unconscious|fainted|syncope|seizure|convulsions|மயக்கம்|बेहोश|दौरा", "Loss of Consciousness / Seizure", "CRITICAL"),
    # Severe bleeding / trauma
    (r"uncontrolled bleeding|heavy bleeding|head injury|அதிக ரத்தப்போக்கு|अत्यधिक खून बहना", "Severe Hemorrhage / Major Trauma", "HIGH"),
    # Severe Allergic / Anaphylaxis
    (r"swelling of lips|tongue swelling|anaphylaxis|அலர்ஜி மூச்சுத் திணறல்|एलर्जी सांस की रुकावट", "Suspected Severe Anaphylaxis", "HIGH")
]

def check_emergency_symptoms(text: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Scans input text for critical warning symptoms.
    Returns (is_emergency, warning_symptom, severity)
    """
    if not text:
        return False, None, None
        
    lower_text = text.lower()
    for pattern, label, severity in EMERGENCY_KEYWORDS:
        if re.search(pattern, lower_text):
            return True, label, severity
            
    return False, None, None
