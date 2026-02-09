// js/cover-bg.js

document.addEventListener("DOMContentLoaded", function() {

    // 1. CONFIGURATION
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Palette
    const colorGold = "#c5a059";   // The Seam (Silence)
    const colorBlood = "#7f2c99";  // The Break (Voice/Purple)

    // 2. SETUP SVG
    const svg = d3.select("#organic-bg")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // 3. GENERATE THE SEAM (One organic line)
    // Meandering vertical line (Kintsugi Style)
    const pointsCount = 60;
    const seamData = [];
    
    let currentX = width / 2; 
    for (let i = 0; i <= pointsCount; i++) {
        currentX += (Math.random() - 0.5) * 20; // Gentle meander
        seamData.push({ x: currentX, y: (height / pointsCount) * i });
    }

    // 4. DRAW THE SEAM (Two halves)
    const lineGenerator = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveBasis); 

    // Left Half
    const seamLeft = svg.append("path")
        .datum(seamData)
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", colorGold)
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.8);

    // Right Half (Identical on top)
    const seamRight = svg.append("path")
        .datum(seamData)
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", colorGold)
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.8);


    // 5. THE INTERACTION
    const btn = document.getElementById("break-btn");
    
    btn.addEventListener("click", function() {
        
        // A. VANISH UI (Button, Quote, Footer disappear immediately)
        document.querySelector(".enter-btn").classList.add("fade-out");
        document.querySelector(".quote-box").classList.add("fade-out");
        document.querySelector(".glass-footer").classList.add("fade-out");

        // B. THE RUPTURE ANIMATION
        const t = d3.transition().duration(1500).ease(d3.easeExpOut);

        // Move Left Seam -> Left
        seamLeft.transition(t)
            .attr("transform", "translate(-150, 0)") // Pull apart
            .attr("stroke", colorBlood) // Turn Purple
            .attr("stroke-width", 8)    // Swell
            .style("opacity", 0);       // Fade out as it leaves

        // Move Right Seam -> Right
        seamRight.transition(t)
            .attr("transform", "translate(150, 0)") // Pull apart
            .attr("stroke", colorBlood)
            .attr("stroke-width", 8)
            .style("opacity", 0);

        // C. THE FLOOD (Ink Spreading from the crack)
        // We delay slightly so it looks like it leaks FROM the crack
        svg.append("circle")
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("r", 0)
            .attr("fill", colorGold)
            .attr("opacity", 1)
            .transition().delay(100).duration(1200).ease(d3.easeCircleIn)
            .attr("r", width * 1.5) // Fills entire screen
            .on("end", () => {
                // D. REDIRECT (Once screen is full purple)
                window.location.href = "chapters/chapter1.html";
            });
    });
});