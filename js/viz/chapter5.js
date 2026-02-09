document.addEventListener("DOMContentLoaded", function() {
    const tooltip = d3.select("#viz-tooltip");

    Promise.all([
        d3.json("../../data/ch5_funnel.json"),
        d3.json("../../data/ch5_reparations.json"),
        d3.json("../../data/ch5_network.json"),
        d3.json("../../data/roots_data.json")
    ]).then(([funnelData, repData, netData, rootsData]) => {
        const shadowTotal = d3.sum(rootsData, d => d.Projected);
        const attritionData = [
            { "Stage": "Forensic Shadow", "Value": shadowTotal, "Description": "Projected victims across global conflict zones." },
            ...funnelData
        ];

        const width = document.querySelector(".viz-block").getBoundingClientRect().width - 60;
        
        drawAttritionFlow(attritionData, width, 450);
        drawRadialReach(repData, width, 350);
        drawInteractiveNetwork(netData, width, 750);
    });

    function drawAttritionFlow(data, w, h) {
        const svg = d3.select("#viz-attrition-flow").attr("viewBox", `0 0 ${w} ${h}`);
        const padding = 120;
        const xScale = d3.scalePoint().domain(data.map(d => d.Stage)).range([padding, w - padding]);
        const thicknessScale = d3.scaleLog().domain([50, 2000000]).range([6, 130]);

        const areaGen = d3.area().x(d => xScale(d.Stage)).y0(d => (h/2) - (thicknessScale(d.Value)/2)).y1(d => (h/2) + (thicknessScale(d.Value)/2)).curve(d3.curveBasis);

        svg.append("path").datum(data).attr("class", "flow-path").attr("d", areaGen).attr("fill", "#1a1a1a").attr("fill-opacity", 0.08);

        const nodes = svg.selectAll(".node-group").data(data).join("g");
        nodes.append("circle")
            .attr("cx", d => xScale(d.Stage)).attr("cy", h/2).attr("r", d => Math.max(thicknessScale(d.Value)/2, 8))
            .attr("fill", d => d.Stage === "Forensic Shadow" ? "var(--gold)" : "var(--ink)").attr("fill-opacity", 0.95)
            .style("cursor", "crosshair")
            .on("mouseover", (e, d) => {
                tooltip.style("display", "block").html(`<div style="font-weight:700; font-size:1.1rem;">${d.Stage}</div><div style="font-size:1.8rem; margin:5px 0; color:var(--purple)">${d.Value.toLocaleString()}</div><div>${d.Description}</div>`);
            })
            .on("mousemove", e => tooltip.style("left", (e.clientX + 15) + "px").style("top", (e.clientY - 15) + "px"))
            .on("mouseout", () => tooltip.style("display", "none"));

        nodes.append("text").attr("x", d => xScale(d.Stage)).attr("y", d => h/2 + thicknessScale(d.Value)/2 + 30).attr("text-anchor", "middle").attr("class", "funnel-label").text(d => d.Stage.toUpperCase());
    }

    function drawRadialReach(data, w, h) {
        const svg = d3.select("#viz-radial-reach").attr("viewBox", `0 0 ${w} ${h}`);
        const radius = 60;
        const spacing = w / (data.length + 1);
        const arc = d3.arc().innerRadius(radius - 12).outerRadius(radius).startAngle(0).cornerRadius(5);

        const g = svg.selectAll(".gauge").data(data).join("g").attr("transform", (d, i) => `translate(${(i + 1) * spacing}, ${h/2})`);
        g.append("path").attr("d", arc.endAngle(2 * Math.PI)).attr("fill", "#f0f0f0");
        g.append("path").attr("fill", "var(--gold)").transition().duration(2500).attrTween("d", d => {
            const i = d3.interpolate(0, (d.Survivors_Reached / d.Survivors_In_Need) * 2 * Math.PI);
            return t => arc.endAngle(i(t))();
        });

        g.append("text").attr("text-anchor", "middle").attr("dy", "0.3em").style("font-family", "Lato").style("font-weight", "700").style("font-size", "1.1rem").text(d => Math.round((d.Survivors_Reached / d.Survivors_In_Need) * 100) + "%");
        g.append("text").attr("y", radius + 35).attr("text-anchor", "middle").style("font-family", "Cormorant Garamond").style("font-size", "1rem").text(d => d.Country);
    }

    function drawInteractiveNetwork(data, w, h) {
        const svg = d3.select("#viz-network").attr("viewBox", `0 0 ${w} ${h}`);
        
        const sim = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).distance(220)) 
            .force("charge", d3.forceManyBody().strength(-800))
            .force("center", d3.forceCenter(w / 2, h / 2))
            .force("collision", d3.forceCollide().radius(80)); // Prevents label overlap

        const link = svg.append("g").selectAll("line").data(data.links).join("line").attr("stroke", "#eee").attr("stroke-width", 2);

        const node = svg.append("g").selectAll("g").data(data.nodes).join("g").style("cursor", "pointer")
            .call(d3.drag()
                .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
                .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

        node.append("circle").attr("r", d => d.r + 6)
            .attr("fill", d => d.group === "Target" ? "#d0021b" : d.group === "Funder" ? "var(--gold)" : "var(--ink)")
            .attr("stroke", "#fff").attr("stroke-width", 3);

        node.append("text").attr("dx", d => d.r + 15).attr("dy", 5).text(d => d.id);

        node.on("mouseover", function(event, d) {
            const neighbors = data.links.filter(l => l.source.id === d.id || l.target.id === d.id).map(l => l.source.id === d.id ? l.target.id : l.source.id);
            node.style("opacity", n => (n.id === d.id || neighbors.includes(n.id)) ? 1 : 0.1);
            link.style("stroke-opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.05).style("stroke-width", 3);
        }).on("mouseout", () => {
            node.style("opacity", 1);
            link.style("stroke-opacity", 0.6).style("stroke-width", 2);
        });

        sim.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
    }
});