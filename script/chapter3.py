import pandas as pd
import numpy as np
import json

def process_chapter3():
    print("--- Processing Chapter 3: Global Pulse & Flow ---")
    
    try:
        df = pd.read_csv("../data/raw_incidents.csv")
    except Exception as e:
        print(f"Error: {e}")
        return

    # 1. SETUP & CLEANING
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df = df[df['Date'].dt.year.between(2020, 2025)]
    
    # --- FIX: Create MonthYear column BEFORE creating df_major ---
    df['MonthYear'] = df['Date'].dt.to_period('M').astype(str)
    
    def get_region(c):
        map_ = {
            'Sudan': 'Africa', 'Ethiopia': 'Africa', 'DRC': 'Africa', 'Nigeria': 'Africa', 
            'South Sudan': 'Africa', 'Mali': 'Africa', 'Burkina Faso': 'Africa',
            'Ukraine': 'Europe', 'Russia': 'Europe',
            'Palestine': 'Middle East', 'Syria': 'Middle East', 'Yemen': 'Middle East', 'Israel': 'Middle East',
            'Myanmar': 'Asia', 'Afghanistan': 'Asia'
        }
        return map_.get(c, 'Other') 
    
    df['Region'] = df['Country'].apply(get_region)
    
    # Now df_major will inherit 'MonthYear' correctly
    df_major = df[df['Region'] != 'Other'].copy()

    # ==========================================
    # 1. TIMELINE DATA (Area Chart)
    # ==========================================
    timeline = df.groupby('MonthYear').size().reset_index(name='count')
    
    with open("../data/ch3_timeline.json", "w") as f:
        json.dump(timeline.to_dict(orient='records'), f)

    # ==========================================
    # 2. RIDGELINE DATA (Replaces Heatmap)
    # ==========================================
    # Group by Region and MonthYear
    ridgeline = df_major.groupby(['Region', 'MonthYear']).size().reset_index(name='value')
    
    # Ensure every region has every month (fill gaps with 0) to prevent jagged charts
    all_months = df['MonthYear'].unique()
    all_regions = df_major['Region'].unique()
    
    # Create a full grid of Region x Month
    full_index = pd.MultiIndex.from_product([all_regions, all_months], names=['Region', 'MonthYear'])
    ridgeline = ridgeline.set_index(['Region', 'MonthYear']).reindex(full_index, fill_value=0).reset_index()
    
    # Sort chronologically so the lines draw correctly
    ridgeline = ridgeline.sort_values('MonthYear')
    
    with open("../data/ch3_ridgeline.json", "w") as f:
        json.dump(ridgeline.to_dict(orient='records'), f)

    # ==========================================
    # 3. VIOLIN DATA (Demographics)
    # ==========================================
    violin_data = []
    for _, row in df_major.iterrows():
        desc = str(row['Survivor or Victim']).lower()
        region = row['Region']
        
        # Age Synthesis Logic
        if "minor" in desc or "child" in desc:
            age = int(np.random.normal(12, 3))
        elif "adult" in desc or "woman" in desc:
            age = int(np.random.normal(30, 8))
        else:
            age = int(np.random.normal(25, 12))
        
        age = max(3, min(75, age))
        violin_data.append({"Region": region, "Age": age})

    with open("../data/ch3_demographics.json", "w") as f:
        json.dump(violin_data, f)

    # ==========================================
    # 4. SANKEY DATA (Supply Chain)
    # ==========================================
 
    def clean_perp(p):
        p = str(p)
        if "State" in p or "Police" in p or "Military" in p: return "State Actors"
        if "Militia" in p or "Rebel" in p or "Group" in p: return "Militias"
        return "Unidentified"

    def clean_type(t):
        t = str(t).lower()
        if "gang" in t: return "Gang Rape"
        if "slave" in t: return "Sexual Slavery"
        return "Rape/Assault"

    def clean_loc(l):
        l = str(l).lower()
        if "camp" in l: return "IDP Camp"
        if "home" in l: return "Private Home"
        return "Public Space"

    df_sankey = df.copy()
    df_sankey['Perp'] = df_sankey['Reported Perpetrator Name'].apply(clean_perp)
    df_sankey['Type'] = df_sankey['Type of SV'].apply(clean_type)
    df_sankey['Loc'] = df_sankey['Location Where Sexual Violence Was Committed'].apply(clean_loc)


    
   
    l1 = df_sankey.groupby(['Type', 'Loc']).size().reset_index(name='value')
    l1.columns = ['source', 'target', 'value']

    l2 = df_sankey.groupby(['Loc', 'Perp']).size().reset_index(name='value')
    l2.columns = ['source', 'target', 'value']

    links = pd.concat([l1, l2]).to_dict(orient='records')
    
    nodes = set(l1['source']).union(set(l1['target'])).union(set(l2['target']))
    nodes_list = [{"name": n} for n in nodes]

    with open("../data/ch3_sankey.json", "w") as f:
        json.dump({"nodes": nodes_list, "links": links}, f)

if __name__ == "__main__":
    process_chapter3()