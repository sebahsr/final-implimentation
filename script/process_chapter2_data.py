import pandas as pd
import numpy as np
import json

def process_chapter2():
    print("--- Processing Chapter 2: Geography & Architects ---")
    
    # 1. LOAD DATA SOURCES
    try:
        # Source A: Verified Incidents (The dots)
        df_incidents = pd.read_csv("../data/raw_incidents.csv")
        
        # Source B: ACLED Index (The background map colors)
        df_acled = pd.read_csv("../data/acled_conflict_index_fullyear2024_allcolumns-2.csv")
        
        # Source C: Chapter 1 Projections (The numbers)
        # We load this to ensure Chapter 2 matches Chapter 1 exactly.
        with open("../data/roots_data.json", "r") as f:
            roots_data = json.load(f)
            
    except Exception as e:
        print(f"Error loading data: {e}")
        print("Make sure you have run 'calculate_roots.py' first to generate roots_data.json!")
        return

    # 2. FILTER DATE (2020 - 2025)
    df_incidents['Date'] = pd.to_datetime(df_incidents['Date'], errors='coerce')
    df_incidents = df_incidents[df_incidents['Date'].dt.year.between(2020, 2025)]
    standard_name = "Democratic Republic of Congo"
    # 3. STANDARDIZE NAMES (Robust Mapping)
    # This fixes the "DRC showing 0" issue by aligning HDX names to ACLED names
    name_map = {
        "DRC": "Democratic Republic of Congo",
        "Democratic Republic of the Congo": "Democratic Republic of Congo",
        "CAR": "Central African Republic",
        "OPT": "Palestine",
        "State of Palestine": "Palestine",
        "Chechnya": "Russia", 
        "PNG": "Papua New Guinea",
        "USA": "United States",
        "UK": "United Kingdom",
        "Bahams": "Bahamas",
        "Côte d'Ivoire": "Ivory Coast", 
        "CÃ´te d'Ivoire": "Ivory Coast",
        "Macedonia": "North Macedonia",
        "Syrian Arab Republic": "Syria",
        "Myanmar (Burma)": "Myanmar",
        "Sudan": "Sudan",
        "South Sudan": "South Sudan",
        'DRC': 'Democratic Republic of the Congo',
    'Congo': 'Democratic Republic of the Congo',
    "DRC": standard_name,
        "Democratic Republic of the Congo": standard_name,
        "Congo, Democratic Republic of": standard_name,
        "Congo": standard_name,
        "Congo-Kinshasa": standard_name,
        "CAR": "Central African Republic",
        "OPT": "Palestine",
        "State of Palestine": "Palestine"
    }
    
    df_incidents['Country'] = df_incidents['Country'].replace(name_map)
    df_acled['Country'] = df_acled['Country'].replace(name_map)
    # NEW: Create an ISO mapping from your raw incidents
    iso_map = df_incidents.set_index('Country')['Country ISO'].to_dict()
    # 4. CREATE LOOKUP DICTIONARIES
    
    # A. Projections from Chapter 1 (The Truth)
    # Maps "Sudan" -> {projected: 568000, multiplier: 2000}
    roots_lookup = {
        row['Country']: {
            'projected': row['Projected'], 
            'multiplier': row['Multiplier']
        } for row in roots_data
    }

    # B. Danger Scores from ACLED (The Map Color)
    # Maps "Sudan" -> 1951
    df_acled['Danger Value'] = df_acled['Danger Value'].fillna(0)
    danger_lookup = df_acled.set_index('Country')['Danger Value'].to_dict()

    # 5. PREPARE MAP DATA (Merging Everything)
    
    # Group incidents by country to get the "Verified" count
    country_stats = df_incidents.groupby('Country').size().reset_index(name='Reported')

    # Build the final list for the map
    final_map_stats = []
    
    # We want to include every country that has EITHER incidents OR a danger score
    all_countries = set(country_stats['Country']).union(set(df_acled['Country']))
    
    max_danger = df_acled['Danger Value'].max()

    for country in all_countries:
        # Get Verified Count
        reported = country_stats.loc[country_stats['Country'] == country, 'Reported'].sum() if country in country_stats['Country'].values else 0
        
        # Get Danger Score
        danger = danger_lookup.get(country, 0)
        
        # Get Projections (from Ch1) or Default
        if country in roots_lookup:
            proj = roots_lookup[country]['projected']
            mult = roots_lookup[country]['multiplier']
        else:
            # Fallback if country not in Ch1 (e.g., very safe countries)
            proj = reported
            mult = 1
        
        # Normalize Danger (0-100) for coloring
        norm_danger = (danger / max_danger) * 100 if max_danger > 0 else 0

        final_map_stats.append({
            "Country": country,
            "ISO": iso_map.get(country, ""), # ADDED: Required for the map
            "Reported": int(reported),
            "Danger_Value": int(danger),
            "Normalized_Danger": norm_danger,
            "Projected": int(proj),
            "Multiplier": int(mult),
            "Status": "Ongoing" if norm_danger > 50 else "Latent" # ADDED: Required for the story
        })
    # 6. EXPORT MAP DATA
    incidents_geo = df_incidents[['Latitude', 'Longitude', 'Country']].dropna()
    
    geo_output = {
        "country_stats": final_map_stats,
        "incidents": incidents_geo.to_dict(orient='records')
    }

    with open("../data/geo_impunity_data.json", "w") as f:
        json.dump(geo_output, f)
    print(f"Map Data Exported: {len(final_map_stats)} countries processed.")

   # 7. NARRATIVE DATA: SHADOW GAP & TEXTURE
    # IMPROVEMENT: Narrative Isolation. We exclude Sudan and Ethiopia here 
    # because they have their own dedicated chapters. This keeps Chapter 2 
    # focused on the global pattern of silence.
    excluded_deep_dives = ["Sudan", "Ethiopia"]
    narrative_pool = [c for c in final_map_stats if c['Country'] not in excluded_deep_dives]
    
    # Story A: Shadow Gap (Top 8 most suppressed outliers)
    shadow_gap = sorted(narrative_pool, key=lambda x: x['Multiplier'], reverse=True)[:8]

    # Story B: Texture of Violence (Tactical Categorization)
    # IMPROVEMENT: Using a more robust keyword list to capture nuances of "Systemic" violence
    def categorize_location(loc):
        l = str(loc).lower()
        public_keywords = ['street', 'road', 'field', 'market', 'open', 'forest', 'village']
        systemic_keywords = ['detention', 'prison', 'camp', 'captivity', 'police', 'checkpoint', 'barracks', 'base']
        
        if any(k in l for k in public_keywords): return "Public"
        if any(k in l for k in systemic_keywords): return "Systemic"
        return "Private/Other"

    df_incidents['Cat'] = df_incidents['Location Where Sexual Violence Was Committed'].apply(categorize_location)
    
    texture_data = []
    # Using Democratic Republic of Congo, Nigeria, and Myanmar as comparative 
    # pillars to show different tactical "textures" globally.
    focus_countries = ["Democratic Republic of Congo", "Nigeria", "Myanmar"]
    for c in focus_countries:
        subset = df_incidents[df_incidents['Country'] == c]
        if not subset.empty:
            dist = subset['Cat'].value_counts(normalize=True).to_dict()
            texture_data.append({
                "Country": c,
                "Public": round(dist.get("Public", 0) * 100, 1),
                "Systemic": round(dist.get("Systemic", 0) * 100, 1),
                "Other": round(dist.get("Private/Other", 0) * 100, 1)
            })

    # 8. STORY C: THE IMPUNITY QUADRANT (Global Prognosis)
    # IMPROVEMENT: Ensure Multiplier has a floor of 1 to prevent D3 log-scale crashes.
    prognosis_data = []
    for c in final_map_stats:
        danger = c['Normalized_Danger']
        # Floor multiplier at 1 for D3 log scales (log(0) is undefined)
        mult = max(1, c['Multiplier']) 
        
        # Analytical Quadrant Logic
        if danger > 50 and mult > 50:
            cat = "Black Hole" 
        elif danger > 50 and mult <= 50:
            cat = "Frontline"  
        elif danger <= 50 and mult > 50:
            cat = "Neglected"  
        else:
            cat = "Monitored"  
            
        prognosis_data.append({
            "Country": c['Country'],
            "Danger": round(danger, 1),
            "Multiplier": mult,
            "Projected": c['Projected'],
            "Category": cat
        })

    # 9. FINAL EXPORT & VALIDATION
    # IMPROVEMENT: Group narrative data into one clean JSON to reduce server requests in D3
    narrative_output = {
        "shadow_gap": shadow_gap, 
        "texture_data": texture_data,
        "prognosis_data": prognosis_data
    }

    try:
        with open("../data/narrative_data.json", "w") as f:
            json.dump(narrative_output, f, indent=4)
        print("--- Narrative Data Exported Successfully ---")
        print(f"Top Shadow Outlier: {shadow_gap[0]['Country']} ({shadow_gap[0]['Multiplier']}x)")
        print(f"Total Black Holes identified: {len([p for p in prognosis_data if p['Category'] == 'Black Hole'])}")
    except Exception as e:
        print(f"Error exporting narrative data: {e}")

if __name__ == "__main__":
    process_chapter2()