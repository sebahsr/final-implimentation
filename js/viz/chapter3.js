document.addEventListener("DOMContentLoaded", function() {
    const tooltip = d3.select("body").append("div").attr("class", "shared-tooltip").style("opacity", 0);

    function moveTooltip(event, content) {
        tooltip.style("opacity", 1).html(content)
            .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
    }

    Promise.all([
        d3.json("../../ch3_timeline.json"),
        d3.json("../../ch3_ridgeline.json"),
        d3.json("../../ch3_demographics.json"),
        d3.json("../../ch3_sankey.json")
    ]).then(([timeData, ridgeData, demogData, sankeyData]) => {
        const width = 1100;
        
        drawTimeline(timeData, width, 450);
        drawStreamHeartbeat(ridgeData, width, 550);
        drawRegionalViolins(demogData, width, 500);
        drawOperationalSlinky(sankeyData, width, 600);
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('is-visible'); });
        }, { threshold: 0.1 });
        document.querySelectorAll('.viz-block').forEach(v => observer.observe(v));
    });

    // --- 1. TIMELINE (Verified Pulse) ---
    function drawTimeline(data, w, h) {
        const svg = d3.select("#viz-timeline").attr("viewBox", `0 0 ${w} ${h}`);
        const x = d3.scaleTime().domain(d3.extent(data, d => d3.timeParse("%Y-%m")(d.MonthYear))).range([60, w-60]);
        const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).range([h-60, 40]);

        svg.append("path").datum(data).attr("class", "bar-ghost").attr("d", d3.area().x(d => x(d3.timeParse("%Y-%m")(d.MonthYear))).y0(h-60).y1(d => y(d.count)).curve(d3.curveMonotoneX));
        
        svg.selectAll("circle").data(data).join("circle")
           .attr("cx", d => x(d3.timeParse("%Y-%m")(d.MonthYear))).attr("cy", d => y(d.count)).attr("r", 4).attr("fill", "var(--gold)")
           .on("mouseenter", (e, d) => moveTooltip(e, `<div class="tooltip-header">${d.MonthYear}</div>Verified Reports: <strong>${d.count}</strong>`))
           .on("mouseleave", () => tooltip.style("opacity", 0));

        svg.append("g").attr("transform", `translate(0,${h-60})`).call(d3.axisBottom(x).ticks(8)).attr("class", "axis-label");
        svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y).ticks(5)).attr("class", "axis-label");
    }

    // --- 2. REGIONAL HEARTBEAT (Streamgraph with Hover Data) ---
    function drawStreamHeartbeat(data, w, h) {
        const svg = d3.select("#viz-stream").attr("viewBox", `0 0 ${w} ${h}`);
        const regions = Array.from(new Set(data.map(d => d.Region)));
        const pivot = Array.from(d3.group(data, d => d.MonthYear), ([key, value]) => {
            const obj = { MonthYear: key, date: d3.timeParse("%Y-%m")(key) };
            value.forEach(v => obj[v.Region] = v.value);
            return obj;
        }).sort((a,b) => a.date - b.date);

        const layers = d3.stack().keys(regions).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(pivot);
        const x = d3.scaleTime().domain(d3.extent(pivot, d => d.date)).range([60, w-60]);
        const y = d3.scaleLinear().domain([d3.min(layers, l => d3.min(l, d => d[0])), d3.max(layers, l => d3.max(l, d => d[1]))]).range([h-60, 60]);
        const colors = ["var(--purple)", "var(--gold)", "#d0021b", "#444"];

        svg.selectAll("path").data(layers).join("path")
           .attr("d", d3.area().curve(d3.curveBasis).x(d => x(d.data.date)).y0(d => y(d[0])).y1(d => y(d[1])))
           .attr("fill", (d, i) => colors[i % colors.length]).attr("fill-opacity", 0.6)
           .on("mouseenter", function(e, d) {
                d3.select(this).attr("fill-opacity", 0.9);
                moveTooltip(e, `<div class="tooltip-header">${d.key} Heartbeat</div>Observe regional pulse over time.`);
           })
           .on("mousemove", function(e, d) {
                // Find data point closest to mouse
                const mouseDate = x.invert(d3.pointer(e)[0]);
                const bisect = d3.bisector(d => d.date).left;
                const i = bisect(pivot, mouseDate);
                const point = pivot[i] || pivot[pivot.length-1];
                moveTooltip(e, `<div class="tooltip-header">${d.key} - ${point.MonthYear}</div>Verified Reports: <strong>${point[d.key] || 0}</strong>`);
           })
           .on("mouseleave", function() { d3.select(this).attr("fill-opacity", 0.6); tooltip.style("opacity", 0); });

        svg.append("g").attr("transform", `translate(0,${h-30})`).call(d3.axisBottom(x)).attr("class", "axis-label");
    }

    // --- 3. REGIONAL VIOLINS (Age Percentages) ---
    function drawRegionalViolins(data, w, h) {
        const svg = d3.select("#viz-violins").attr("viewBox", `0 0 ${w} ${h}`);
        const regions = ["Africa", "Asia", "Europe", "Middle East"];
        const x = d3.scaleBand().domain(regions).range([60, w-60]).padding(0.2);
        const y = d3.scaleLinear().domain([0, 100]).range([h-60, 40]);

        function kde(kernel, thresholds) { return V => thresholds.map(t => [t, d3.mean(V, v => kernel(t - v))]); }
        function epanechnikov(k) { return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0; }

        regions.forEach(region => {
            const subset = data.filter(d => d.Region === region).map(d => d.Age);
            const density = kde(epanechnikov(7), y.ticks(40))(subset);
            const xNum = d3.scaleLinear().domain([0, d3.max(density, d => d[1])]).range([0, x.bandwidth()/2]);

            svg.append("path").datum(density).attr("class", "violin-path")
               .attr("transform", `translate(${x(region) + x.bandwidth()/2}, 0)`)
               .attr("d", d3.area().x0(d => -xNum(d[1])).x1(d => xNum(d[1])).y(d => y(d[0])).curve(d3.curveCatmullRom))
               .on("mouseenter", (e) => moveTooltip(e, `<div class="tooltip-header">${region} Age Curve</div>Human demographics of the silence.`))
               .on("mousemove", function(e) {
                    const mouseAge = Math.round(y.invert(d3.pointer(e)[1]));
                    const countAtAge = subset.filter(a => Math.abs(a - mouseAge) < 5).length;
                    const perc = ((countAtAge / subset.length) * 100).toFixed(1);
                    moveTooltip(e, `<div class="tooltip-header">${region}</div>Age: <strong>~${mouseAge}</strong><br>Nearby Density: <strong>${perc}%</strong>`);
               })
               .on("mouseleave", () => tooltip.style("opacity", 0));
        });

        svg.append("g").attr("transform", `translate(0,${h-60})`).call(d3.axisBottom(x)).selectAll("text").style("font-family", "Cormorant Garamond");
        svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y).ticks(5)).attr("class", "axis-label");
    }

  function drawOperationalSlinky(data, w, h) {
        const svg = d3.select("#viz-sankey").attr("viewBox", `0 0 ${w} ${h}`);
        const sankey = d3.sankey().nodeWidth(20).nodePadding(40).extent([[140, 40], [w - 140, h - 40]]);
        
        const nodes = data.nodes.map(d => ({...d}));
        const links = data.links.map(l => ({
            source: data.nodes.findIndex(n => n.name === l.source),
            target: data.nodes.findIndex(n => n.name === l.target),
            value: l.value
        }));

        const {nodes: sNodes, links: sLinks} = sankey({ nodes, links });

        // Categorical Color Scale for Nodes
        const categoryColor = d3.scaleOrdinal()
            .domain(["Rape/Assault", "Sexual Slavery", "Gang Rape", "Public Space", "Private Home", "IDP Camp", "Unidentified", "State Actors", "Militias"])
            .range(["var(--gold)", "var(--gold)", "var(--gold)", "#8ca7ff", "#00ff88", "#ff42a7", "var(--purple)", "var(--blood)", "#791212"]);

        // Gradients
        const defs = svg.append("defs");
        sLinks.forEach((l, i) => {
            const grad = defs.append("linearGradient").attr("id", `sl-grad-${i}`).attr("gradientUnits", "userSpaceOnUse")
                             .attr("x1", l.source.x1).attr("x2", l.target.x0);
            grad.append("stop").attr("offset", "0%").attr("stop-color", categoryColor(l.source.name));
            grad.append("stop").attr("offset", "100%").attr("stop-color", categoryColor(l.target.name));
        });

        // Flow Strands
        svg.append("g").selectAll("path").data(sLinks).join("path")
           .attr("class", "sankey-link").attr("d", d3.sankeyLinkHorizontal())
           .attr("stroke", (d, i) => `url(#sl-grad-${i})`).attr("stroke-width", d => Math.max(1, d.width))
           .on("mouseenter", (e, d) => {
                const totalAtNode = d3.sum(sLinks.filter(l => l.source.name === d.source.name), link => link.value);
                const perc = ((d.value / totalAtNode) * 100).toFixed(1);
                moveTooltip(e, `<div class="tooltip-header">Forensic Flow</div><strong>${d.source.name}</strong> &rarr; <strong>${d.target.name}</strong><br>Contribution: <strong>${perc}%</strong>`);
           })
           .on("mouseleave", () => tooltip.style("opacity", 0));

        // Nodes
        const node = svg.append("g").selectAll("g").data(sNodes).join("g");
        node.append("rect").attr("x", d => d.x0).attr("y", d => d.y0).attr("height", d => d.y1 - d.y0).attr("width", 20)
            .attr("fill", d => categoryColor(d.name))
            .on("mouseenter", (e, d) => {
                const totalVal = d.value;
                moveTooltip(e, `<div class="tooltip-header">${d.name}</div>Total Volume: <strong>${totalVal}</strong>`);
            })
            .on("mouseleave", () => tooltip.style("opacity", 0));

        node.append("text").attr("x", d => d.x0 - 12).attr("y", d => (d.y0 + d.y1)/2).attr("text-anchor", "end").attr("dy", "0.35em")
            .style("font-family", "Cormorant Garamond").style("font-size", "11px").text(d => d.name);
    }
});
