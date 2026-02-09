const config = {
    margin: { top: 40, right: 60, bottom: 50, left: 100 },
    width: 900,
    colors: { 
        sudan: "#8e44ad", 
        ethiopia: "#c5a028",
        types: ["#8e44ad", "#d35400", "#c5a028"]
    }
};

const tooltip = d3.select("#tooltip");

async function init() {
    try {
        const stripesData = await d3.json('../../Data/ch4_stripes.json');
        const ageData = await d3.json('../../Data/ch4_pyramid.json');
        const waffleData = await d3.json('../../Data/ch4_waffle.json');
        
        drawStripeChart(stripesData);
        drawButterflyChart(ageData);
        drawCompositionChart(waffleData);
        
        d3.selectAll(".viz-block").classed("is-visible", true);
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

function drawStripeChart(data) {
    const parseDate = d3.utcParse("%Y-%m-%d");
    data.forEach(d => d.dateObj = parseDate(d.Date));
    const height = 300;
    const svg = d3.select("#viz-stripes").attr("viewBox", `0 0 ${config.width} ${height}`);
    const x = d3.scaleUtc().domain(d3.extent(data, d => d.dateObj)).range([config.margin.left + 20, config.width - config.margin.right]);
    const y = d3.scaleBand().domain(["Sudan", "Ethiopia"]).range([60, height - 60]).padding(0.4);

    svg.append("g").attr("transform", `translate(0,${height - 40})`).attr("class", "axis-label").call(d3.axisBottom(x).ticks(5));

    const stripes = svg.selectAll(".stripe-group").data(data).enter().append("g");
    stripes.append("line")
        .attr("x1", d => x(d.dateObj)).attr("x2", d => x(d.dateObj))
        .attr("y1", d => y(d.Country)).attr("y2", d => y(d.Country) + y.bandwidth())
        .attr("stroke", d => d.Country === "Sudan" ? config.colors.sudan : config.colors.ethiopia)
        .attr("stroke-width", 2).attr("stroke-opacity", 0.35);

    stripes.append("rect")
        .attr("x", d => x(d.dateObj) - 4).attr("y", d => y(d.Country))
        .attr("width", 8).attr("height", y.bandwidth()).attr("fill", "transparent").style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this.parentNode).select("line").attr("stroke-opacity", 1).attr("stroke-width", 4);
            tooltip.style("opacity", 1).style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 20) + "px")
                .html(`<div class="tooltip-header">${d.Country} Incident</div>Date: ${d.Date}`);
        }).on("mouseout", function() {
            d3.select(this.parentNode).select("line").attr("stroke-opacity", 0.35).attr("stroke-width", 2);
            tooltip.style("opacity", 0);
        });

    svg.selectAll(".label").data(["Sudan", "Ethiopia"]).enter().append("text")
        .attr("x", 20).attr("y", d => y(d) + y.bandwidth()/2 + 5).attr("class", "axis-label").text(d => d.toUpperCase());
}

function drawButterflyChart(data) {
    const height = 400;
    const centerGap = 160;
    const svg = d3.select("#viz-butterfly").attr("viewBox", `0 0 ${config.width} ${height}`);
    const maxVal = d3.max(data, d => Math.max(d.Sudan, d.Ethiopia));
    const xLeft = d3.scaleLinear().domain([0, maxVal]).range([config.width/2 - centerGap/2, 50]);
    const xRight = d3.scaleLinear().domain([0, maxVal]).range([config.width/2 + centerGap/2, config.width - 50]);
    const y = d3.scaleBand().domain(data.map(d => d.Age)).range([60, height - 60]).padding(0.3);

    const bars = svg.selectAll(".bar-pair").data(data).enter().append("g");
    
    // Sudan (Left)
    bars.append("rect")
        .attr("x", d => xLeft(d.Sudan)).attr("y", d => y(d.Age))
        .attr("width", d => Math.max(0, (config.width/2 - centerGap/2) - xLeft(d.Sudan)))
        .attr("height", y.bandwidth()).attr("fill", config.colors.sudan).attr("fill-opacity", 0.6)
        .on("mouseover", (e, d) => {
            tooltip.style("opacity", 1).style("left", (e.pageX + 15) + "px").style("top", (e.pageY - 20) + "px")
                   .html(`<div class="tooltip-header">Sudan: ${d.Age}</div>Verified Count: ${d.Sudan}`);
        }).on("mouseout", () => tooltip.style("opacity", 0));

    // Ethiopia (Right)
    bars.append("rect")
        .attr("x", config.width/2 + centerGap/2).attr("y", d => y(d.Age))
        .attr("width", d => Math.max(0, xRight(d.Ethiopia) - (config.width/2 + centerGap/2)))
        .attr("height", y.bandwidth()).attr("fill", config.colors.ethiopia).attr("fill-opacity", 0.6)
        .on("mouseover", (e, d) => {
            tooltip.style("opacity", 1).style("left", (e.pageX + 15) + "px").style("top", (e.pageY - 20) + "px")
                   .html(`<div class="tooltip-header">Ethiopia: ${d.Age}</div>Verified Count: ${d.Ethiopia}`);
        }).on("mouseout", () => tooltip.style("opacity", 0));

    svg.selectAll(".age-text").data(data).enter().append("text")
        .attr("x", config.width/2).attr("y", d => y(d.Age) + y.bandwidth()/2 + 5)
        .attr("text-anchor", "middle").attr("class", "axis-label").style("font-size", "11px").text(d => d.Age.toUpperCase());
}

function drawCompositionChart(data) {
    const height = 300;
    const svg = d3.select("#viz-composition").attr("viewBox", `0 0 ${config.width} ${height}`);
    
    const nest = d3.groups(data, d => d.Country).map(([country, values]) => {
        const counts = d3.rollup(values, v => v.length, d => d.Type);
        const total = values.length;
        return {
            Country: country,
            "Assault/Rape": ((counts.get("Assault/Rape") || 0) / total * 100),
            "Public (Gang Rape)": ((counts.get("Public (Gang Rape)") || 0) / total * 100),
            "Systemic (Slavery/Camps)": ((counts.get("Systemic (Slavery/Camps)") || 0) / total * 100)
        };
    });

    const stack = d3.stack().keys(["Assault/Rape", "Public (Gang Rape)", "Systemic (Slavery/Camps)"]);
    const series = stack(nest);

    const y = d3.scaleBand().domain(["Sudan", "Ethiopia"]).range([60, height - 60]).padding(0.4);
    const x = d3.scaleLinear().domain([0, 100]).range([config.margin.left + 50, config.width - config.margin.right]);
    const color = d3.scaleOrdinal().domain(["Assault/Rape", "Public (Gang Rape)", "Systemic (Slavery/Camps)"]).range(config.colors.types);

    // FIXED: Changed .format() to .tickFormat()
    svg.append("g").attr("transform", `translate(0,${height - 40})`).attr("class", "axis-label")
       .call(d3.axisBottom(x).tickFormat(d => d + "%"));

    svg.append("g").selectAll("g").data(series).enter().append("g")
        .attr("fill", d => color(d.key))
        .selectAll("rect").data(d => d).enter().append("rect")
        .attr("y", d => y(d.data.Country)).attr("x", d => x(d[0])).attr("width", d => x(d[1]) - x(d[0])).attr("height", y.bandwidth())
        .on("mouseover", function(event, d) {
            const type = d3.select(this.parentNode).datum().key;
            tooltip.style("opacity", 1).style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 20) + "px")
                .html(`<div class="tooltip-header">${d.data.Country}: ${type}</div><strong>${d.data[type].toFixed(1)}%</strong> of record`);
        }).on("mouseout", () => tooltip.style("opacity", 0));

    svg.selectAll(".country-label").data(["Sudan", "Ethiopia"]).enter().append("text")
        .attr("x", 20).attr("y", d => y(d) + y.bandwidth()/2 + 5).attr("class", "axis-label").text(d => d.toUpperCase());
}

init();