import pandas as pd
import json

def process_chapter5():
    print("--- Processing Chapter 5: The Response & The Failure ---")

    # ==========================================
    # A. THE FUNNEL OF IMPUNITY (The Legal Failure)
    # Based on UN 2023 Reports + 1:20 Dark Figure Ratio
    # ==========================================
    funnel_data = [
        {"Stage": "Estimated Victims", "Value": 72000, "Description": "Based on 1:20 underreporting ratio"},
        {"Stage": "Reported Cases", "Value": 15000, "Description": "Incidents flagged to NGOs/Health centers"},
        {"Stage": "UN Verified", "Value": 3600, "Description": "Officially verified by UN mechanisms (2023)"},
        {"Stage": "Investigations", "Value": 800, "Description": "Cases formally opened by national/int'l courts"},
        {"Stage": "Convictions", "Value": 50, "Description": "Successful prosecutions (Global Estimate)"}
    ]
    
    with open("../data/ch5_funnel.json", "w") as f:
        json.dump(funnel_data, f)

    # ==========================================
    # B. REPARATIONS GAP (GSF Data)
    # Survivors Reached vs. Estimated Need in key zones
    # ==========================================
    # Data derived from GSF Annual Reports (2020-2023)
    reparations_data = [
        {"Country": "Dem. Republic of Congo", "Survivors_In_Need": 25000, "Survivors_Reached": 3200, "Status": "Active Project"},
        {"Country": "Iraq (Yazidis)", "Survivors_In_Need": 6000, "Survivors_Reached": 1800, "Status": "State Law Passed"},
        {"Country": "Guinea", "Survivors_In_Need": 500, "Survivors_Reached": 450, "Status": "Interim Measures"},
        {"Country": "Ukraine", "Survivors_In_Need": 4000, "Survivors_Reached": 500, "Status": "Pilot Phase"},
        {"Country": "CAR", "Survivors_In_Need": 12000, "Survivors_Reached": 800, "Status": "Early Stage"}
    ]
    
    with open("../data/ch5_reparations.json", "w") as f:
        json.dump(reparations_data, f)

    # ==========================================
    # C. THE ARCHITECTURE (Network)
    # Who does what? (UN Women Explainer + GSF Reports)
    # ==========================================
    network_data = {
        "nodes": [
            {"id": "Survivors", "group": "Target", "r": 20},
            
            # The Coordinators
            {"id": "UN Action", "group": "Coordinator", "r": 15},
            {"id": "SRSG-SVC", "group": "Coordinator", "r": 15},
            
            # The Implementers (Medical/Legal)
            {"id": "Mukwege Foundation", "group": "Implementer", "r": 10},
            {"id": "Nadia's Initiative", "group": "Implementer", "r": 10},
            {"id": "All Survivors Project", "group": "Implementer", "r": 10},
            
            # The Funders/Reparations
            {"id": "Global Survivors Fund", "group": "Funder", "r": 18},
            {"id": "Trust Fund for Victims", "group": "Funder", "r": 12},
            
            # The Legal Bodies
            {"id": "ICC", "group": "Legal", "r": 12},
            {"id": "National Courts", "group": "Legal", "r": 10}
        ],
        "links": [
            {"source": "UN Action", "target": "SRSG-SVC", "type": "Coordination"},
            {"source": "SRSG-SVC", "target": "Survivors", "type": "Advocacy"},
            
            {"source": "Global Survivors Fund", "target": "Survivors", "type": "Reparations"},
            {"source": "Global Survivors Fund", "target": "Mukwege Foundation", "type": "Partner"},
            {"source": "Global Survivors Fund", "target": "Nadia's Initiative", "type": "Partner"},
            
            {"source": "All Survivors Project", "target": "Survivors", "type": "Men/Boys Focus"},
            
            {"source": "ICC", "target": "National Courts", "type": "Jurisdiction"},
            {"source": "National Courts", "target": "Survivors", "type": "Justice (Rare)"}
        ]
    }

    with open("../data/ch5_network.json", "w") as f:
        json.dump(network_data, f)

    print("Success: Generated ch5_funnel, ch5_reparations, ch5_network")

if __name__ == "__main__":
    process_chapter5()