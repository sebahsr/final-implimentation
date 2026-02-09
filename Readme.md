# README: Lineage of Silence - Investigative Forensic Reconstruction

**Student Name:** Sebah Tewodros Tesfatsion

**ID Number:** 7405796

**Institution:** University of Genova

**Hosting:** [GitHub Pages] (or repository link)

---

## 1. Project Overview

**Lineage of Silence** is a data-driven, five-chapter investigative project exploring the global and regional patterns of Conflict-Related Sexual Violence (CRSV). By integrating verified humanitarian records with forensic projections, the project exposes the "Justice Gap"—the chasm between the reality of violence and the record of formal accountability.

The project focuses specifically on the **Ethiopian and Sudanese corridor**, mapping the cyclical nature of displacement and the tactical targeting of specific demographics during these conflicts.

---

## 2. Folder Structure

The repository is organized to maintain a clear separation between raw data, processing scripts, and the final web frontend.

```text
/root
│
├── index.html               # Investigative Landing Page
├── data.html                # Technical Data Deep-Dive Page
│
├── /chapters                # Narrative Content
│   ├── chapter1.html        # The Tip of the Iceberg
│   ├── chapter2.html        # The Geography of Fear
│   ├── chapter3.html        # The Temporal Pulse
│   ├── chapter4.html        # The Geography of Scars (Ethiopia/Sudan)
│   └── chapter5.html        # The Architecture of Hope
│
├── /css                     # Forensic Aesthetic & Layout
│   ├── global.css           # Inherited Typography & Nav
│   ├── chapter3.css         # Scrollytelling Transitions
│   └── chapter5.css         # Glassmorphism & Viz Containers
│
├── /js                      # D3.js Visualization Logic
│   ├── main.js              # Site-wide entry point
│   └── /viz                 # Chapter-specific logic
│       ├── chapter1.js      # Global Projections
│       ├── chapter3.js      # Temporal Ridgelines & Sankey
│       ├── chapter4.js      # Incident Barcodes & Butterfly Charts
│       └── chapter5.js      # Flow, Radial Compass, & Network
│
├── /Data                    # Output Data (JSON used by Viz)
│   ├── roots_data.json      # Forensic Projections (1.9M total)
│   ├── ch4_stripes.json     # Incident Dates (Sudan/Ethiopia)
│   └── ch5_network.json     # Accountability Web
│
└── /script                  # Python ETL Backend
    ├── raw_incidents.csv    # Source: HDX/ACLED
    ├── calculate_roots.py   # Initial Multiplier Logic
    └── chapter1-5.py        # D3-ready JSON Generators

```

---

## 3. Data Processing (ETL)

The project utilizes a custom Python backend to standardize disparate datasets and calculate forensic projections.

### Preprocessing Requirements

* **Python 3.x**
* **Libraries:** `pandas`, `numpy`, `scikit-learn`, `json`.

### Running the Preprocessing

If you wish to regenerate the data from raw sources:

1. Navigate to the `/script` folder.
2. Run the primary projection script:
```bash
python calculate_roots.py

```


*This resolves naming conflicts (e.g., "DRC" to "Democratic Republic of Congo") and applies the 1:1000 multiplier logic.*
3. Run the chapter-specific generators to populate the `/Data` directory:
```bash
python chapter3.py
python chapter4.py
python chapter5.py

```


*These scripts generate ridgeline time-series, demographic violin plots, and force-directed network structures.*

---

## 4. Serving the Website Locally

Due to **CORS (Cross-Origin Resource Sharing)** restrictions in modern browsers, D3.js cannot load external JSON files directly via the `file://` protocol. You must use a local server.

### Option 1: Python (Recommended)

Run the following command in the root directory:

```bash
python -m http.server 8000

```

Then, visit `http://localhost:8000` in your browser.

### Option 2: VS Code Live Server

1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension.
3. Click "Go Live" in the bottom status bar.

---

## 5. Visual Language & Methodology

* **The Forensic Shadow:** We utilize a "Suppression Score" (70% Danger, 30% Deadliness) to calculate the multiplier for each conflict zone.
* **Temporal Friction:** Chapter IV uses a "Barcode" visualization (Forensic Stripe) where every vertical line is a life recorded, showing the sudden rupture in Sudan vs. the grinding pulse in Ethiopia.
* **The Web of Accountability:** A force-directed simulation maps the shift from state-led legal failure to survivor-led support networks.

---

**Course:** Data Visualization - AY 2025/2026



