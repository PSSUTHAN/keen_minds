import datetime
import uuid
from typing import Dict, Any, List

def build_fhir_bundle(summary_data: Dict[str, Any], patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates an HL7 FHIR R4 compliant JSON Bundle for hospital information systems (HIS) & ABDM compatibility.
    """
    bundle_id = f"urn:uuid:{uuid.uuid4()}"
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    
    patient_id = f"patient-{patient_data.get('id', '001')}"
    
    # FHIR Patient resource
    patient_resource = {
        "fullUrl": f"urn:uuid:{patient_id}",
        "resource": {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [
                {
                    "system": "https://healthid.ndhm.gov.in",
                    "value": patient_data.get("abha_id") or f"ABHA-MOCK-{patient_data.get('id', '101')}"
                }
            ],
            "name": [{"text": patient_data.get("name", "Unknown Patient")}],
            "telecom": [{"system": "phone", "value": patient_data.get("phone", "")}],
            "gender": patient_data.get("gender", "unknown").lower(),
            "birthDate": str(datetime.datetime.now().year - patient_data.get("age", 30))
        }
    }
    
    # FHIR Composition resource (Clinical History Document)
    composition_resource = {
        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
        "resource": {
            "resourceType": "Composition",
            "status": "final",
            "type": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "34117-2",
                        "display": "History and Physical Note"
                    }
                ]
            },
            "subject": {"reference": f"urn:uuid:{patient_id}"},
            "date": timestamp,
            "title": "MediKiosk Structured AI Clinical History Summary",
            "section": [
                {
                    "title": "Chief Complaint",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "10154-3", "display": "Chief complaint"}]},
                    "text": {"status": "generated", "div": f"<div>{summary_data.get('chief_complaint', 'N/A')}</div>"}
                },
                {
                    "title": "History of Present Illness",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "10164-2", "display": "History of Present illness"}]},
                    "text": {"status": "generated", "div": f"<div>{summary_data.get('hpi', 'N/A')}</div>"}
                },
                {
                    "title": "Past Medical & Surgical History",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "11348-0", "display": "History of Past illness"}]},
                    "text": {"status": "generated", "div": f"<div>{summary_data.get('past_medical_surgical', 'N/A')}</div>"}
                },
                {
                    "title": "Medications",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "10160-0", "display": "History of Medication use"}]},
                    "text": {"status": "generated", "div": f"<div>{summary_data.get('medication_history', 'N/A')}</div>"}
                },
                {
                    "title": "Allergies",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "48765-2", "display": "Allergies and adverse reactions"}]},
                    "text": {"status": "generated", "div": f"<div>{summary_data.get('allergy_history', 'N/A')}</div>"}
                },
                {
                    "title": "AYUSH Dashavidha Pariksha Assessment",
                    "code": {"coding": [{"system": "http://ayush.gov.in", "code": "AYUSH-DASHAVIDHA", "display": "Ayurvedic 10-Fold Assessment"}]},
                    "text": {"status": "generated", "div": f"<div>{summary_data.get('ayush_assessment', 'N/A')}</div>"}
                }
            ]
        }
    }
    
    fhir_bundle = {
        "resourceType": "Bundle",
        "id": bundle_id,
        "type": "document",
        "timestamp": timestamp,
        "entry": [patient_resource, composition_resource]
    }
    
    return fhir_bundle

def push_to_mock_his(fhir_bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates sending the FHIR R4 document to a Hospital Information System (HIS) endpoint.
    """
    return {
        "his_status": "SUCCESS",
        "ack_id": f"HIS-ACK-{uuid.uuid4().hex[:8].upper()}",
        "pushed_at": datetime.datetime.utcnow().isoformat() + "Z",
        "message": "Clinical summary successfully imported into Hospital Electronic Medical Record (EMR)."
    }
