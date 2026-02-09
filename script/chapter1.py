import pandas as pd
import numpy as np
import json
from sklearn.preprocessing import MinMaxScaler

def generate_dynamic_roots_data():
    print("--- Starting Data Processing (Corrected Logic) ---")

    # 1. LOAD DATA
    try:
        df_incidents = pd.read_csv("../data/raw_incidents.csv")
        df_acled = pd.read_csv("../data/acled_conflict_index_fullyear2024_allcolumns-2.csv")
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    # 2. FILTER DATE (2020 - 2025)
    df_incidents['Date'] = pd.to_datetime(df_incidents['Date'], errors='coerce')
    df_incidents = df_incidents[df_incidents['Date'].dt.year.between(2020, 2025)]

    # 3. STANDARDIZE NAMES (Robust Mapping)
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
        "South Sudan": "South Sudan"
    }
    df_incidents['Country'] = df_incidents['Country'].replace(name_map)
    df_acled['Country'] = df_acled['Country'].replace(name_map)

    # 4. GROUP BY COUNTRY (Reported incidents)
    country_stats = df_incidents.groupby('Country').size().reset_index(name='Reported')

    # 5. PREPARE ACLED DATA & CAP OUTLIERS
    # We cap 'Danger' at 2000. Anything above 2000 is treated as "Max Danger".
    # This prevents Palestine (7000) from making Sudan (1900) look "Safe".
    df_acled['Danger_Capped'] = df_acled['Danger Value'].fillna(0).clip(upper=2000)
    df_acled['Deadliness_Capped'] = df_acled['Deadliness Value'].fillna(0).clip(upper=10000)

    # 6. LOG TRANSFORM (Smoothing)
    features = ['Danger_Capped', 'Deadliness_Capped']
    for f in features:
        df_acled[f"{f}_Log"] = np.log1p(df_acled[f])

    # 7. SCALE (0 to 1)
    scaler = MinMaxScaler()
    log_features = [f"{f}_Log" for f in features]
    scaled_features = scaler.fit_transform(df_acled[log_features])
    
    df_scaled = pd.DataFrame(scaled_features, columns=[f"{f}_Scaled" for f in features])
    df_acled = pd.concat([df_acled, df_scaled], axis=1)

    # 8. CALCULATE SUPPRESSION SCORE
    # Weighted: 70% Danger (Risk to civilians), 30% Deadliness
    df_acled['Suppression_Score'] = (
        df_acled['Danger_Capped_Scaled'] * 0.7 +
        df_acled['Deadliness_Capped_Scaled'] * 0.3
    )

    # 9. CALCULATE MULTIPLIER (Exponential Curve)
    # Score 0 (Safe) -> 1x
    # Score 1 (Extreme) -> 2000x
    MAX_MULTIPLIER = 2000
    df_acled['Multiplier'] = (MAX_MULTIPLIER ** df_acled['Suppression_Score']).astype(int)

    # 10. PEACE OVERRIDE (The Fix for Canada)
    # If ACLED says "Low/Inactive", multiplier is strictly 1.
    df_acled.loc[df_acled['Index Level'] == 'Low/Inactive', 'Multiplier'] = 1

    # 11. MERGE DATASETS
    df_merged = pd.merge(country_stats, df_acled, on='Country', how='left')

    # Defaults for countries missing in ACLED
    df_merged['Multiplier'] = df_merged['Multiplier'].fillna(1)
    df_merged['Index Level'] = df_merged['Index Level'].fillna("Low/Inactive")
    df_merged['Danger Value'] = df_merged['Danger Value'].fillna(0)

    # 12. LATENT BASELINE (The "Blackout" Rule)
    # If Danger > 500 (War Zone) but Reports == 0, assume 10 hidden cases.
    MIN_LATENT_CASES = 10
    conflict_zone = df_merged['Danger Value'] > 500
    
    df_merged['Adjusted_Reported'] = df_merged['Reported']
    # Apply latent baseline only if reported is 0 or very low in a war zone
    mask_blackout = conflict_zone & (df_merged['Reported'] < MIN_LATENT_CASES)
    df_merged.loc[mask_blackout, 'Adjusted_Reported'] = MIN_LATENT_CASES

    # 13. CALCULATE PROJECTED TOTALS
    df_merged['Projected'] = (df_merged['Adjusted_Reported'] * df_merged['Multiplier']).astype(int)

    # 14. ADD CONTINENT METADATA
    def get_continent(c):
        map_ = {
            # Africa
            'Sudan': 'Africa', 'South Sudan': 'Africa', 'Ethiopia': 'Africa', 'Democratic Republic of Congo': 'Africa', 
            'Nigeria': 'Africa', 'Mali': 'Africa', 'Burkina Faso': 'Africa', 'Cameroon': 'Africa', 'Central African Republic': 'Africa', 
            'Somalia': 'Africa', 'Mozambique': 'Africa', 'Burundi': 'Africa', 'Kenya': 'Africa', 'Chad': 'Africa', 'Niger': 'Africa', 
            'Uganda': 'Africa', 'Libya': 'Africa', 'Egypt': 'Africa', 'Algeria': 'Africa', 'Morocco': 'Africa', 'Tunisia': 'Africa', 
            'Ivory Coast': 'Africa', 'Eritrea': 'Africa', 'Gabon': 'Africa', 'Ghana': 'Africa', 'Guinea': 'Africa', 'Rwanda': 'Africa', 
            'Senegal': 'Africa', 'Sierra Leone': 'Africa', 'South Africa': 'Africa', 'Tanzania': 'Africa', 'Togo': 'Africa', 'Zambia': 'Africa', 'Zimbabwe': 'Africa',
            
            # Middle East
            'Palestine': 'Middle East', 'Syria': 'Middle East', 'Yemen': 'Middle East', 'Iraq': 'Middle East', 'Israel': 'Middle East', 
            'Lebanon': 'Middle East', 'Jordan': 'Middle East', 'Iran': 'Middle East', 'Saudi Arabia': 'Middle East', 'Turkey': 'Middle East', 
            
            # Europe
            'Ukraine': 'Europe', 'Russia': 'Europe', 'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Italy': 'Europe', 
            
            # Asia
            'Myanmar': 'Asia', 'India': 'Asia', 'Afghanistan': 'Asia', 'Pakistan': 'Asia', 'Philippines': 'Asia', 'Bangladesh': 'Asia', 
            
            # Americas
            'Mexico': 'Americas', 'Haiti': 'Americas', 'Colombia': 'Americas', 'Brazil': 'Americas', 'Venezuela': 'Americas', 
            'United States': 'Americas', 'Canada': 'Americas', 'Honduras': 'Americas'
        }
        return map_.get(c, 'Other')

    df_merged['Continent'] = df_merged['Country'].apply(get_continent)

    # 15. FORMAT FINAL JSON
    final_cols = ['Country', 'Reported', 'Index Level', 'Multiplier', 'Projected', 'Continent']
    df_final = df_merged[final_cols].sort_values('Projected', ascending=False)

    # 16. SAVE
    output_path = "../data/roots_data.json"
    json_result = df_final.to_json(orient='records')
    parsed = json.loads(json_result)
    
    with open(output_path, 'w') as f:
        json.dump(parsed, f, indent=4)
        
    print(f"--- Success! Generated {output_path} ---")
    print(df_final[['Country', 'Reported', 'Multiplier', 'Projected']].head(10))

if __name__ == "__main__":
    generate_dynamic_roots_data()