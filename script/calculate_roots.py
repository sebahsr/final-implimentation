import pandas as pd
import json

def generate_corrected_roots_data():
    # 1. LOAD DATA
    df_incidents = pd.read_csv("../data/raw_incidents.csv")
    df_acled = pd.read_csv("../data/acled_conflict_index_fullyear2024_allcolumns-2.csv")

    # 2. FILTER DATE
    df_incidents['Date'] = pd.to_datetime(df_incidents['Date'], errors='coerce')
    df_incidents = df_incidents[df_incidents['Date'].dt.year.between(2020, 2025)]
    
    # 3. FIX NAMES (The Critical Step)
    name_map = {
        "DRC": "Democratic Republic of the Congo",
        "CAR": "Central African Republic",
        "OPT": "Palestine",
        "Chechnya": "Russia", 
        "PNG": "Papua New Guinea",
        "USA": "United States",
        "UK": "United Kingdom",
        "Bahams": "Bahamas",
        "C\u00f4te d'Ivoire": "Ivory Coast", 
        "Macedonia": "North Macedonia"
    }
    df_incidents['Country'] = df_incidents['Country'].replace(name_map)
    
    # 4. GROUP BY COUNTRY
    country_stats = df_incidents.groupby('Country').size().reset_index(name='Reported')

    # 5. MERGE WITH ACLED
    df_merged = pd.merge(country_stats, df_acled[['Country', 'Index Level']], on='Country', how='left')

    # 6. FILL MISSING DATA (Fixes the NaN issue)
    # If ACLED has no data, we assume it's peaceful (Low/Inactive)
    df_merged['Index Level'] = df_merged['Index Level'].fillna('Low/Inactive')

    # 7. MULTIPLIER LOGIC
    def get_multiplier(row):
        level = row['Index Level']
        if level == 'Extreme': return 2000
        elif level == 'High': return 1000
        elif level == 'Turbulent': return 500
        else: return 1 # Low/Inactive gets 1

    df_merged['Multiplier'] = df_merged.apply(get_multiplier, axis=1)
    df_merged['Projected'] = df_merged['Reported'] * df_merged['Multiplier']

    # 8. COMPREHENSIVE CONTINENT MAPPING
    def get_continent(c):
        map_ = {
            # Africa
            'Sudan': 'Africa', 'South Sudan': 'Africa', 'Ethiopia': 'Africa', 'Democratic Republic of the Congo': 'Africa', 
            'Nigeria': 'Africa', 'Mali': 'Africa', 'Burkina Faso': 'Africa', 'Cameroon': 'Africa', 'Central African Republic': 'Africa', 
            'Somalia': 'Africa', 'Mozambique': 'Africa', 'Burundi': 'Africa', 'Kenya': 'Africa', 'Chad': 'Africa', 'Niger': 'Africa', 
            'Uganda': 'Africa', 'Libya': 'Africa', 'Egypt': 'Africa', 'Algeria': 'Africa', 'Morocco': 'Africa', 'Tunisia': 'Africa', 
            'Angola': 'Africa', 'Benin': 'Africa', 'Botswana': 'Africa', 'Comoros': 'Africa', 'Republic of Congo': 'Africa', 'Congo': 'Africa',
            'Ivory Coast': 'Africa', 'Djibouti': 'Africa', 'Equatorial Guinea': 'Africa', 'Eritrea': 'Africa', 'Eswatini': 'Africa', 
            'Gabon': 'Africa', 'Gambia': 'Africa', 'Ghana': 'Africa', 'Guinea': 'Africa', 'Guinea-Bissau': 'Africa', 'Lesotho': 'Africa', 
            'Liberia': 'Africa', 'Madagascar': 'Africa', 'Malawi': 'Africa', 'Mauritania': 'Africa', 'Mauritius': 'Africa', 'Namibia': 'Africa', 
            'Rwanda': 'Africa', 'Sao Tome and Principe': 'Africa', 'Senegal': 'Africa', 'Seychelles': 'Africa', 'Sierra Leone': 'Africa', 
            'South Africa': 'Africa', 'Tanzania': 'Africa', 'Togo': 'Africa', 'Zambia': 'Africa', 'Zimbabwe': 'Africa',
            
            # Middle East
            'Palestine': 'Middle East', 'Syria': 'Middle East', 'Yemen': 'Middle East', 'Iraq': 'Middle East', 'Israel': 'Middle East', 
            'Lebanon': 'Middle East', 'Jordan': 'Middle East', 'Iran': 'Middle East', 'Saudi Arabia': 'Middle East', 'Turkey': 'Middle East', 
            'United Arab Emirates': 'Middle East', 'Qatar': 'Middle East', 'Kuwait': 'Middle East', 'Oman': 'Middle East', 'Bahrain': 'Middle East',
            
            # Europe
            'Ukraine': 'Europe', 'Russia': 'Europe', 'Belarus': 'Europe', 'Moldova': 'Europe', 'United Kingdom': 'Europe', 'France': 'Europe', 
            'Germany': 'Europe', 'Italy': 'Europe', 'Spain': 'Europe', 'Poland': 'Europe', 'Romania': 'Europe', 'Netherlands': 'Europe', 
            'Belgium': 'Europe', 'Greece': 'Europe', 'Portugal': 'Europe', 'Sweden': 'Europe', 'Hungary': 'Europe', 'Austria': 'Europe', 
            'Serbia': 'Europe', 'Switzerland': 'Europe', 'Bulgaria': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe', 'Slovakia': 'Europe', 
            'Norway': 'Europe', 'Ireland': 'Europe', 'Croatia': 'Europe', 'Bosnia and Herzegovina': 'Europe', 'Albania': 'Europe', 
            'Lithuania': 'Europe', 'North Macedonia': 'Europe', 'Slovenia': 'Europe', 'Latvia': 'Europe', 'Estonia': 'Europe', 
            'Montenegro': 'Europe', 'Luxembourg': 'Europe', 'Malta': 'Europe', 'Iceland': 'Europe', 'Kosovo': 'Europe', 'Cyprus': 'Europe',
            
            # Asia
            'Myanmar': 'Asia', 'India': 'Asia', 'Afghanistan': 'Asia', 'Pakistan': 'Asia', 'Philippines': 'Asia', 'Bangladesh': 'Asia', 
            'China': 'Asia', 'Indonesia': 'Asia', 'Japan': 'Asia', 'Vietnam': 'Asia', 'Thailand': 'Asia', 'South Korea': 'Asia', 
            'North Korea': 'Asia', 'Malaysia': 'Asia', 'Nepal': 'Asia', 'Sri Lanka': 'Asia', 'Cambodia': 'Asia', 'Laos': 'Asia', 
            'Mongolia': 'Asia', 'Uzbekistan': 'Asia', 'Kazakhstan': 'Asia', 'Turkmenistan': 'Asia', 'Tajikistan': 'Asia', 'Kyrgyzstan': 'Asia', 
            'Bhutan': 'Asia', 'Maldives': 'Asia', 'Singapore': 'Asia', 'Taiwan': 'Asia', 'Timor-Leste': 'Asia', 'Brunei': 'Asia', 
            'Armenia': 'Asia', 'Azerbaijan': 'Asia', 'Georgia': 'Asia', 'Papua New Guinea': 'Asia',
            
            # Americas
            'Mexico': 'Americas', 'Haiti': 'Americas', 'Colombia': 'Americas', 'Brazil': 'Americas', 'Venezuela': 'Americas', 'Honduras': 'Americas', 
            'United States': 'Americas', 'Canada': 'Americas', 'Argentina': 'Americas', 'Peru': 'Americas', 'Chile': 'Americas', 'Guatemala': 'Americas', 
            'Ecuador': 'Americas', 'Bolivia': 'Americas', 'Cuba': 'Americas', 'Dominican Republic': 'Americas', 'Paraguay': 'Americas', 
            'Nicaragua': 'Americas', 'El Salvador': 'Americas', 'Costa Rica': 'Americas', 'Panama': 'Americas', 'Uruguay': 'Americas', 
            'Jamaica': 'Americas', 'Trinidad and Tobago': 'Americas', 'Guyana': 'Americas', 'Suriname': 'Americas', 'Belize': 'Americas', 
            'Bahamas': 'Americas', 'Barbados': 'Americas', 'Saint Lucia': 'Americas', 'Grenada': 'Americas', 'New Zealand': 'Oceania',
        }
        return map_.get(c, 'Other') # Default to Other if not found

    df_merged['Continent'] = df_merged['Country'].apply(get_continent)
    
    # 9. OUTPUT SORTED BY PROJECTED
    df_final = df_merged[df_merged['Reported'] > 0].sort_values('Projected', ascending=False)
    
    json_output = df_final.to_dict(orient='records')
    
    with open("../data/roots_data.json", "w") as f:
        json.dump(json_output, f, indent=4)
        
    print(f"Exported {len(json_output)} countries to roots_data.json (No NaNs)")

if __name__ == "__main__":
    generate_corrected_roots_data()