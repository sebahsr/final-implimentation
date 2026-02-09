document.addEventListener("DOMContentLoaded", function() {

    // --- 1. CONFIGURATION & SELECTORS ---
    const mapContainer = d3.select("#viz-map");
    const mapRect = document.getElementById("block-map").getBoundingClientRect();
    const mapWidth = mapRect.width;
    const mapHeight = mapRect.height;

    // --- 2. SHARED TOOLTIP (Fixed Tracking) ---
    d3.selectAll(".shared-tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "shared-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("z-index", "1000");

    // Unified helper to move tooltip using pageX/Y (accounts for scrolling)
    function moveTooltip(event, content) {
        tooltip.style("opacity", 1)
            .html(content)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px");
    }

    // --- 3. LOAD DATA ---
    Promise.all([
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"), 
        d3.json("../../data/geo_impunity_data.json"),
        d3.json("../../data/narrative_data.json")
    ]).then(([worldGeo, geoData, narrativeData]) => {
        
        drawImpunityMap(worldGeo, geoData, mapWidth, mapHeight);
        drawShadowGap(narrativeData.shadow_gap, 550, 450); 
        drawStackedMagnitude(geoData.country_stats);
      

    }).catch(err => console.error("Data Load Error:", err));


    // --- 4. VIZ FUNCTIONS ---

    function drawImpunityMap(world, data, width, height) {
        const svg = mapContainer;
        const projection = d3.geoMercator()
            .center([0, 20]) 
            .scale(width / 6.5) 
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);
        const statsLookup = new Map(data.country_stats.map(d => [d.Country, d]));
        
        // Handle naming fallbacks inside the lookup
        data.country_stats.forEach(d => {
            if (d.Country === "Democratic Republic of the Congo") statsLookup.set("DRC", d);
            if (d.Country === "Sudan") statsLookup.set("Republic of the Sudan", d);
        });

        const colorScale = d3.scaleLinear()
            .domain([0, 25, 100])
            .range(["#e8e8e8", "#b39ddb", "var(--purple)"]);

        const g = svg.append("g");

        // Draw Countries
        const countries = g.selectAll(".country-path")
            .data(world.features)
            .join("path")
            .attr("d", path)
            .attr("class", "country-path")
            .attr("fill", d => {
                const s = statsLookup.get(d.properties.name);
                return s ? colorScale(s.Normalized_Danger) : "#f4f4f4";
            })
            .attr("stroke", "#d1d1d1")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mousemove", function(event, d) {
                d3.select(this).attr("stroke", "#111").attr("stroke-width", 1.5);
                const name = d.properties.name;
                const s = statsLookup.get(name) || { Reported: 0, Projected: 0, Multiplier: 1 };
                
                const content = `
                    <div class="tooltip-header">${name}</div>
                    <div class="metric">Verified: <strong>${s.Reported.toLocaleString()}</strong></div>
                    <div class="metric" style="color:var(--purple)">Projected: <strong>${s.Projected.toLocaleString()}</strong></div>
                    <div style="font-size:0.7rem; color:#999; margin-top:4px;">Suppression: ${s.Multiplier}x</div>
                `;
                moveTooltip(event, content);
            })
            .on("mouseleave", function() {
                d3.select(this).attr("stroke", "#d1d1d1").attr("stroke-width", 0.5);
                tooltip.style("opacity", 0);
            });

        // Draw Gold Dots
        g.selectAll("circle")
            .data(data.incidents)
            .join("circle")
            .attr("cx", d => projection([+d.Longitude, +d.Latitude])[0])
            .attr("cy", d => projection([+d.Longitude, +d.Latitude])[1])
            .attr("r", 1.8)
            .attr("fill", "var(--gold)")
            .attr("fill-opacity", 0.8)
            .style("pointer-events", "none"); 

       const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Min zoom 1x, Max zoom 8x
        .translateExtent([[0, 0], [width, height]]) // Map cannot be dragged outside these pixels
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
        svg.call(zoom);
    }

    function drawShadowGap(data, w, h) {
        const svg = d3.select("#viz-shadow").attr("width", w).attr("height", h);
        const margin = {top: 20, right: 30, bottom: 40, left: 140};
        const iW = w - margin.left - margin.right;
        const iH = h - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const y = d3.scaleBand().domain(data.map(d => d.Country)).range([0, iH]).padding(0.4);
        const x = d3.scaleLog().domain([1, d3.max(data, d => d.Projected)]).range([0, iW]);

        // Shadows (Purple)
        const shadows = g.selectAll(".shadow-bar")
            .data(data).join("rect")
            .attr("y", d => y(d.Country))
            .attr("width", d => x(d.Projected))
            .attr("height", y.bandwidth())
            .attr("fill", "var(--purple)")
            .attr("opacity", 0.1);

        // Evidence (Gold)
        g.selectAll(".gold-bar")
            .data(data).join("rect")
            .attr("y", d => y(d.Country))
            .attr("width", d => x(Math.max(1, d.Reported)))
            .attr("height", y.bandwidth())
            .attr("fill", "var(--gold)");

        // Interaction Hitboxes
        g.selectAll(".hitbox")
            .data(data).join("rect")
            .attr("y", d => y(d.Country))
            .attr("width", iW)
            .attr("height", y.bandwidth())
            .attr("fill", "transparent")
            .style("cursor", "pointer")
            .on("mouseenter", (event, d) => {
                updateVisibilityGrid(d); // Triggers Waffle Update
                shadows.filter(s => s.Country === d.Country).attr("opacity", 0.6);
                
                const content = `
                    <div class="tooltip-header">${d.Country}</div>
                    <div class="metric">Suppression: <strong>${d.Multiplier}x</strong></div>
                    <div class="metric">Hidden Reality: <strong>${(d.Projected - d.Reported).toLocaleString()}</strong></div>
                `;
                moveTooltip(event, content);
            })
            .on("mousemove", (event) => moveTooltip(event, tooltip.html()))
            .on("mouseleave", () => {
                shadows.attr("opacity", 0.1);
                tooltip.style("opacity", 0);
            });

        g.append("g").call(d3.axisLeft(y).tickSize(0)).selectAll("text").style("font-family", "Cormorant Garamond");
    }

    function updateVisibilityGrid(d) {
        const container = d3.select("#viz-grid").html(""); 
        const totalBlocks = 400; // 20x20 for higher resolution
        
        // Ceiling ensures at least 1 block is gold even for massive multipliers
        const goldCount = Math.max(1, Math.ceil(totalBlocks / d.Multiplier));

        d3.select("#active-country").text(d.Country);
        d3.select("#active-stat").text(`1 Verified Report vs. ${d.Multiplier} Projected Victims`);

        for (let i = 0; i < totalBlocks; i++) {
            container.append("div")
                .attr("class", i < goldCount ? "block gold" : "block purple")
                .style("opacity", 0)
                .transition()
                .delay(i * 1.5)
                .style("opacity", i < goldCount ? 1 : 0.15);
        }
    }
  function drawStackedMagnitude(data) {
    const top10 = data.sort((a, b) => b.Projected - a.Projected).slice(0, 10);
    const svg = d3.select("#viz-magnitude").attr("width", 1000).attr("height", 500);
    svg.selectAll("*").remove(); // Clear previous renders

    const margin = {top: 40, right: 40, bottom: 100, left: 80};
    const iW = 1000 - margin.left - margin.right;
    const iH = 500 - margin.top - margin.bottom;

    const x = d3.scaleBand().domain(top10.map(d => d.Country)).range([0, iW]).padding(0.4);
    const y = d3.scaleLinear().domain([0, d3.max(top10, d => d.Projected)]).range([iH, 0]);
    
    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    const bars = g.selectAll(".bar-group").data(top10).join("g").attr("class", "bar-group");
    
    // 1. THE MONOLITH (Purple) - Represents the full projected silence
    bars.append("rect")
        .attr("x", d => x(d.Country))
        .attr("y", d => y(d.Projected))
        .attr("width", x.bandwidth())
        .attr("height", d => iH - y(d.Projected))
        .attr("fill", "var(--purple)")
        .attr("opacity", 0.15); // Lowered opacity so it feels like a "shadow"

    // 2. THE FOUNDATION (Gold) - Enhanced visibility clamping
    const minHeight = 5; // Minimum pixels to remain visible
    bars.append("rect")
        .attr("x", d => x(d.Country))
        .attr("y", d => {
            const h = iH - y(d.Reported);
            return h < minHeight ? iH - minHeight : y(d.Reported);
        })
        .attr("width", x.bandwidth())
        .attr("height", d => Math.max(minHeight, iH - y(d.Reported)))
        .attr("fill", "var(--gold)")
        .attr("stroke", "#fff") // White stroke helps it pop against the purple
        .attr("stroke-width", 0.5);

    // 3. INTERACTION HITBOX
    bars.append("rect")
        .attr("x", d => x(d.Country))
        .attr("y", 0)
        .attr("width", x.bandwidth())
        .attr("height", iH)
        .attr("fill", "transparent")
        .on("mousemove", (event, d) => {
            const content = `
                <div class="tooltip-header">${d.Country}</div>
                <div class="tooltip-row"><span>Verified:</span> <strong>${d.Reported.toLocaleString()}</strong></div>
                <div class="tooltip-row" style="color:var(--purple)"><span>Projected:</span> <strong>${d.Projected.toLocaleString()}</strong></div>
            `;
            moveTooltip(event, content);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));

    // AXES
    g.append("g").attr("transform", `translate(0, ${iH})`).call(d3.axisBottom(x))
        .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end").style("font-family", "Cormorant Garamond");
    g.append("g").call(d3.axisLeft(y).ticks(5, "~s"));
}
});