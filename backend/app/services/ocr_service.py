import re
import io
import random
from typing import Dict, Any, List
from PIL import Image

# Common medical term extraction dictionaries for Indian prescriptions & lab reports
KNOWN_DIAGNOSES = [
    "Type 2 Diabetes Mellitus", "Essential Hypertension", "Dyspepsia / Acid Reflux",
    "Acute Upper Respiratory Tract Infection", "Hypothyroidism", "Osteoarthritis - Knee",
    "Bronchial Asthma", "Migraine", "Iron Deficiency Anemia", "Hyperlipidemia"
]

KNOWN_MEDICATIONS = [
    {"name": "Metformin", "dosage": "500mg", "frequency": "BD (Twice daily)"},
    {"name": "Telmisartan", "dosage": "40mg", "frequency": "OD (Once daily)"},
    {"name": "Paracetamol", "dosage": "650mg", "frequency": "TDS (Thrice daily when needed)"},
    {"name": "Pantoprazole", "dosage": "40mg", "frequency": "OD before food"},
    {"name": "Atorvastatin", "dosage": "10mg", "frequency": "HS (At bedtime)"},
    {"name": "Amoxicillin", "dosage": "500mg", "frequency": "TDS for 5 days"},
    {"name": "Thyronorm", "dosage": "50mcg", "frequency": "OD early morning"}
]

KNOWN_LAB_VALS = [
    {"test_name": "Fasting Blood Sugar (FBS)", "value": "138 mg/dL", "unit": "mg/dL", "ref_range": "70 - 99", "flag": "HIGH"},
    {"test_name": "HbA1c (Glycated Hemoglobin)", "value": "7.6 %", "unit": "%", "ref_range": "< 5.7", "flag": "HIGH"},
    {"test_name": "Hemoglobin (Hb)", "value": "11.2 g/dL", "unit": "g/dL", "ref_range": "12.0 - 15.5", "flag": "LOW"},
    {"test_name": "Serum Creatinine", "value": "0.9 mg/dL", "unit": "mg/dL", "ref_range": "0.6 - 1.2", "flag": "NORMAL"},
    {"test_name": "TSH (Thyroid Stimulating Hormone)", "value": "3.8 uIU/mL", "unit": "uIU/mL", "ref_range": "0.45 - 4.5", "flag": "NORMAL"}
]

def process_document_ocr(file_bytes: bytes, filename: str, doc_type: str = "prescription") -> Dict[str, Any]:
    """
    Simulates OCR processing & entity extraction from prescription or lab report image/PDF.
    Parses diagnoses, medications with dosages, lab test values, and dates.
    Calculates confidence scores, marking low-confidence (<75%) entities for UI verification.
    """
    raw_ocr_lines = []
    extracted_entities = {
        "diagnoses": [],
        "medications": [],
        "lab_values": [],
        "dates": []
    }
    
    # Try reading image metadata if valid
    image_valid = False
    try:
        img = Image.open(io.BytesIO(file_bytes))
        image_valid = True
    except Exception:
        image_valid = False

    # Perform intelligent mock entity parsing based on filename / content triggers or synthetic templates
    filename_lower = filename.lower()
    
    if "lab" in filename_lower or doc_type == "lab_report":
        raw_ocr_lines = [
            "CITY DIAGNOSTICS & LAB SERVICES - CHENNAI",
            "Patient Name: Patient Sample | Date: 12-Feb-2026",
            "--------------------------------------------------",
            "TEST NAME                  RESULT      REF RANGE",
            "Fasting Blood Sugar (FBS)  138 mg/dL   70 - 99 mg/dL   [HIGH]",
            "HbA1c (Glycated Hb)        7.6 %       < 5.7 %         [HIGH]",
            "Serum Creatinine           0.9 mg/dL   0.6 - 1.2 mg/dL [NORMAL]",
            "Hemoglobin (Hb)            11.2 g/dL   12.0 - 15.5     [LOW]",
            "--------------------------------------------------",
            "Sign: Dr. R. Kumar, MD Pathology"
        ]
        extracted_entities["lab_values"] = [
            {"test": "Fasting Blood Sugar", "val": "138 mg/dL", "status": "HIGH", "confidence": 0.94},
            {"test": "HbA1c", "val": "7.6 %", "status": "HIGH", "confidence": 0.92},
            {"test": "Hemoglobin", "val": "11.2 g/dL", "status": "LOW", "confidence": 0.68}, # Marked low confidence (<0.75) for highlight!
            {"test": "Serum Creatinine", "val": "0.9 mg/dL", "status": "NORMAL", "confidence": 0.89}
        ]
        extracted_entities["diagnoses"] = [
            {"term": "Uncontrolled Glycemia", "confidence": 0.72} # Low confidence for verification
        ]
        extracted_entities["dates"] = ["12-Feb-2026"]
        ocr_overall_confidence = 0.86

    elif "discharge" in filename_lower or doc_type == "discharge_summary":
        raw_ocr_lines = [
            "APOLLO SPECIALITY HOSPITAL - DISCHARGE SUMMARY",
            "Department of Internal Medicine",
            "Diagnosis: Type 2 Diabetes Mellitus with Essential Hypertension",
            "Admission Date: 10/01/2026 | Discharge Date: 14/01/2026",
            "Course in Hospital: Patient presented with high sugar & dizziness. Stabilized with Insulin & oral meds.",
            "Discharge Advice:",
            "1. Tab Metformin 500mg BD after food",
            "2. Tab Telmisartan 40mg OD in morning",
            "3. Tab Pantoprazole 40mg OD before food"
        ]
        extracted_entities["diagnoses"] = [
            {"term": "Type 2 Diabetes Mellitus", "confidence": 0.96},
            {"term": "Essential Hypertension", "confidence": 0.91}
        ]
        extracted_entities["medications"] = [
            {"name": "Metformin", "dosage": "500mg", "frequency": "BD after food", "confidence": 0.95},
            {"name": "Telmisartan", "dosage": "40mg", "frequency": "OD morning", "confidence": 0.88},
            {"name": "Pantoprazole", "dosage": "40mg", "frequency": "OD before food", "confidence": 0.65} # Low confidence
        ]
        extracted_entities["dates"] = ["10/01/2026", "14/01/2026"]
        ocr_overall_confidence = 0.88

    else:
        # Standard Prescription OCR simulation
        raw_ocr_lines = [
            "DR. S. MEHTA, MD (INT MEDICINE)",
            "Reg No: TN-45892 | Apollo Clinic, Chennai",
            "Date: 20-Jan-2026",
            "Rx:",
            "1. Tab Metformin 500mg -- 1-0-1 (BD) x 30 days",
            "2. Tab Telmisartan 40mg -- 1-0-0 (OD) x 30 days",
            "3. Tab Paracetamol 650mg -- 1-1-1 (TDS) as needed for fever",
            "Advice: Low salt diet, regular walk 30 mins."
        ]
        extracted_entities["diagnoses"] = [
            {"term": "Type 2 Diabetes Mellitus", "confidence": 0.90},
            {"term": "Hypertension", "confidence": 0.85}
        ]
        extracted_entities["medications"] = [
            {"name": "Metformin", "dosage": "500mg", "frequency": "1-0-1 (BD)", "confidence": 0.92},
            {"name": "Telmisartan", "dosage": "40mg", "frequency": "1-0-0 (OD)", "confidence": 0.89},
            {"name": "Paracetamol", "dosage": "650mg", "frequency": "1-1-1 (TDS PRN)", "confidence": 0.70} # Highlighted for verification
        ]
        extracted_entities["dates"] = ["20-Jan-2026"]
        ocr_overall_confidence = 0.85

    raw_ocr_text = "\n".join(raw_ocr_lines)

    return {
        "raw_ocr_text": raw_ocr_text,
        "ocr_confidence": ocr_overall_confidence,
        "extracted_entities": extracted_entities
    }
