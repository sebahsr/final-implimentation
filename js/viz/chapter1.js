document.addEventListener("DOMContentLoaded", function() {

    const globalContainer = document.getElementById('viz-global');
    const regionalContainer = document.getElementById('viz-regional');

    // Create a detail card for interaction if it doesn't exist
    let detailCard = document.getElementById('region-detail');
    if (!detailCard) {
        detailCard = document.createElement('div');
        detailCard.id = 'region-detail';
        regionalContainer.parentElement.appendChild(detailCard); // Append to parent container
    }

    d3.json("https//sebahsr.github.io/final-implimentation/data/roots_data.json").then(data => {
        // --- DATA PREP ---
        const globalReported = d3.sum(data, d => d.Reported);
        const globalProjected = d3.sum(data, d => d.Projected);
         console.log("Global Reported:", globalReported, "Global Projected:", globalProjected);
        const regionalData = Array.from(d3.group(data, d => d.Continent), ([key, value]) => ({
            region: key,
            reported: d3.sum(value, d => d.Reported),
            projected: d3.sum(value, d => d.Projected),
            countries: value.sort((a,b) => b.Projected - a.Projected).slice(0,3) // Top 3 countries for tooltip
        })).sort((a, b) => b.projected - a.projected);

        drawGlobalChart(globalContainer, globalReported, globalProjected);
        drawRegionalGarden(regionalContainer, regionalData);
        setupObserver();
    });

    // ==========================================
    // CHART 1: THE GLOBAL GAP (Improved)
    // ==========================================
    function drawGlobalChart(container, reported, projected) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const svg = d3.select(container);

        // Define Hatch Pattern for "Ghost" effect
        const defs = svg.append("defs");
        defs.append("pattern")
            .attr("id", "diagonalHatch")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 4)
            .attr("height", 4)
            .append("path")
            .attr("d", "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2")
            .attr("stroke", "#7f2c99")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.3);

        const yScale = d3.scaleLinear()
            .domain([0, projected])
            .range([0, height * 0.65]);

        const g = svg.append("g").attr("transform", `translate(${width/2}, ${height * 0.85})`);

        // 1. THE GHOST BAR (Projected)
        const projBar = g.append("rect")
            .attr("class", "bar-ghost")
            .attr("x", -60).attr("width", 120) // Thinner, more elegant bar
            .attr("y", 0).attr("height", 0);

        // 2. THE SOLID BAR (Reported)
        // Ensure minimum visibility (3px)
        const repH = Math.max(3, yScale(reported)); 
        const repBar = g.append("rect")
            .attr("class", "bar-solid")
            .attr("x", -60).attr("width", 120)
            .attr("y", 0).attr("height", 0); // Animate later

        // 3. THE CALLOUT (Magnifier)
        const callout = g.append("g").attr("opacity", 0);
        
        // Elbow connector line
        callout.append("path")
            .attr("class", "callout-line")
            .attr("d", `M 60,${-repH} L 100,${-repH - 40} L 180,${-repH - 40}`)
            .attr("fill", "none");
            
        // Anchor dot
        callout.append("circle")
            .attr("class", "callout-dot")
            .attr("cx", 60).attr("cy", -repH)
            .attr("r", 3);

        // Text
        callout.append("text")
            .attr("class", "callout-text")
            .attr("x", 190).attr("y", -repH - 35)
            .text(`${reported} Verified`);

        // Projected Label (Top)
        const projLabel = g.append("text")
            .attr("text-anchor", "middle")
            .attr("y", -10)
            .attr("class", "callout-text")
            .style("fill", "var(--purple)")
            .text(`${projected} Projected`)
            .attr("opacity", 0);

        // ANIMATION
        container.animateViz = () => {
            projBar.transition().duration(1500).ease(d3.easeCubicOut)
                .attr("y", -yScale(projected))
                .attr("height", yScale(projected));

            projLabel.transition().delay(1200).duration(500)
                .attr("y", -yScale(projected) - 15)
                .attr("opacity", 1);

            repBar.transition().delay(800).duration(1000)
                .attr("y", -repH)
                .attr("height", repH);

            callout.transition().delay(1500).duration(800)
                .attr("opacity", 1);
        };
    }


    // ==========================================
    // CHART 2: REGIONAL GARDEN
    // ==========================================
    function drawRegionalGarden(container, data) {
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const svg = d3.select(container);
        svg.selectAll("*").remove();

        // --- HELPER: Fixes the "0.0k" bug ---
        function formatNum(n) {
            if (n >= 1000) return (n / 1000).toFixed(1) + "k";
            return n.toLocaleString(); // Returns "6", "84", etc. instead of "0.0k"
        }

        const margin = { top: 120, bottom: 50, left: 50, right: 50 };
        const g = svg.append("g").attr("transform", `translate(0, ${margin.top})`);
        
        const chartH = height - margin.top - margin.bottom;

        const x = d3.scalePoint()
            .domain(data.map(d => d.region))
            .range([margin.left, width - margin.right]).padding(0.8);

        const yRoot = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.projected)])
            .range([0, chartH * 0.9]);

        const rPetal = d3.scaleSqrt()
            .domain([0, d3.max(data, d => d.reported)])
            .range([4, 25]);

        g.append("line").attr("x1", margin.left).attr("x2", width - margin.right)
            .attr("stroke", "#ccc").attr("stroke-dasharray", "2,4");

        // Plants
        const plants = g.selectAll(".plant")
            .data(data).enter().append("g")
            .attr("class", "plant")
            .attr("transform", d => `translate(${x(d.region)}, 0)`)
            .on("click", handlePlantClick);

        // Roots
        plants.each(function(d) {
            const group = d3.select(this);
            const depth = yRoot(d.projected);
            
            // Allow even small roots to exist (min 1px)
            if (depth < 0) return; 
            
            const numStrands = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numStrands; i++) {
                // Determine spread based on depth, but ensure minimum spread for visibility
                const spread = Math.max(10, Math.min(40, depth * 0.15)); 
                const drift = (Math.random() - 0.5) * spread; 
                
                // If depth is tiny (e.g. 6 victims), use a small fixed depth so it's visible
                const visibleDepth = Math.max(10, depth);

                const pathStr = `M 0,0 C ${drift},${visibleDepth * 0.3} ${-drift},${visibleDepth * 0.6} ${drift/2},${visibleDepth}`;
                group.append("path").attr("class", "frag-root-strand")
                    .attr("d", pathStr).attr("stroke-dasharray", 1000).attr("stroke-dashoffset", 1000);
            }
        });

        // Stems & Flowers
        plants.append("line").attr("class", "frag-root-strand").style("opacity", 0.8).attr("y1", 0).attr("y2", -40);
        
        plants.each(function(d) {
            const r = rPetal(d.reported);
            const flower = d3.select(this).append("g").attr("class", "flower-head")
                .attr("transform", "translate(0, -40) scale(0)");
            [0, 45, 90, 135].forEach(angle => {
                flower.append("ellipse").attr("rx", r * 0.5).attr("ry", r)
                    .attr("fill", "rgba(212, 175, 55, 0.15)").attr("stroke", "#d4af37").attr("stroke-width", 0.5)
                    .attr("transform", `rotate(${angle})`);
            });
            flower.append("circle").attr("class", "frag-flower-center").attr("r", 2);
        });

        // Labels
        plants.append("text").attr("y", -60).attr("text-anchor", "middle").attr("class", "plant-label")
            .text(d => d.region).attr("opacity", 0);

        // INTERACTION (Updated to use formatNum)
        function handlePlantClick(event, d) {
            event.stopPropagation();
            d3.selectAll(".plant").classed("is-selected", false);
            d3.select(container.parentElement).classed("has-selection", true);
            d3.select(this).classed("is-selected", true);

            const topCountries = d.countries.map(c => 
                `<div>${c.Country}: <span style="color:var(--purple)">${formatNum(c.Projected)}</span></div>`
            ).join('');

            const box = d3.select("#region-detail");
            box.classed("active", true).html(`
                <h4>${d.region}</h4>
                <div class="detail-row"><span>Verified: <strong>${d.reported.toLocaleString()}</strong></span></div>
                <div class="detail-row"><span>Projected: <strong style="color:var(--purple)">${formatNum(d.projected)}</strong></span></div>
                <div class="detail-sub-header">Critical Zones</div>
                <div style="text-align:left; font-size:0.9em; color:#444; line-height:1.4;">${topCountries}</div>
            `);
        }
        
        // Reset Click
        d3.select("body").on("click", () => {
             d3.select(container.parentElement).classed("has-selection", false);
             d3.selectAll(".plant").classed("is-selected", false);
             d3.select("#region-detail").classed("active", false);
        });

        // ANIMATION TRIGGER
        container.animateViz = () => {
            g.selectAll(".frag-root-strand").transition().duration(2500).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
            g.selectAll(".flower-head").transition().delay(1000).duration(1000).ease(d3.easeBackOut).attr("transform", "translate(0, -40) scale(1)");
            g.selectAll(".plant-label").transition().delay(1500).duration(800).attr("opacity", 1);
        };
    }

    // --- OBSERVER ---
    function setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target.querySelector('svg').animateViz) {
                        entry.target.querySelector('svg').animateViz();
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        document.querySelectorAll('.viz-block').forEach(b => observer.observe(b));
    }
});
