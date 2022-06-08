import preppedData from "./preppedData_new.json" assert { type: "json" };
import data from "./data_new.json" assert { type: "json" };
import colorMap from "./colorMap.json" assert { type: "json" };
import TEAMS from "./teams.json" assert { type: "json" };

(function () {
  const MATCH_WIDTH = 10;
  const weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const height = 600;
  const width = 1200;

  const maxMatchesWeek = d3.max(Object.values(_.groupBy(data, "week")).map(d => d.length));

  const svg = d3.select("#chart").append("svg").attr("viewBox", [0, 0, width, height]);

  const margin = {
    top: 35,
    bottom: 75,
    left: 50,
    right: 50,
  };

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`).attr("class", "plotGroup");

  const xScale = d3.scaleBand().domain(weeks).range([0, plotWidth]);
  const yScale = d3.scaleBand().domain(d3.range(maxMatchesWeek)).range([0, plotHeight]).paddingInner(0.3);
  const gameScale = d3.scaleLinear().domain([0, 100]).range([yScale.bandwidth(), 0]);

  const weekGroups = g
    .selectAll(".week")
    .data(preppedData)
    .join("g")
    .attr("transform", (d, i) => `translate(${xScale(i + 1) + xScale.bandwidth() / 2}, 0)`);

  const weekLabelGroups = weekGroups
    .selectAll(".weekLabelGroup")
    .data((d, i) => [i + 1])
    .join("text")
    .attr("x", 0)
    .attr("y", -35)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("font-weight", "500")
    .attr("class", "weekLabelGroup");

  weekLabelGroups
    .selectAll(".weekLabel")
    .data(d => ["WEEK", d])
    .join("tspan")
    .attr("x", 0)
    .attr("dy", "0.7rem")
    .attr("class", "weekLabel")
    .text(d => d);

  const games = weekGroups
    .selectAll(".game")
    .data(d => d)
    .join("g")
    .attr("transform", (d, i) => `translate(0, ${yScale(i)})`);

  games
    .selectAll(".teamLabel")
    .data(d => d)
    .join("text")
    .attr("x", -25)
    .attr("y", (d, i) =>
      i % 2 === 0
        ? gameScale(100) + gameScale(100 - d.success) / 2
        : gameScale(d.success) + gameScale(100 - d.success) / 2
    )
    .attr("text-anchor", "left")
    .attr("font-size", "8px")
    .attr("dy", "4")
    .attr("class", "teamLabel")
    .attr("fill", d => colorMap[d.team].primary)
    .text((d, i) => `${d.team}`);

  games
    .selectAll(".winPercentageLabel")
    .data(d => d)
    .join("text")
    .attr("x", 10)
    .attr("y", (d, i) =>
      i % 2 === 0
        ? gameScale(100) + gameScale(100 - d.success) / 2
        : gameScale(d.success) + gameScale(100 - d.success) / 2
    )
    .attr("text-anchor", "right")
    .attr("font-size", "8px")
    .attr("dy", "4")
    .attr("class", "winPercentageLabel")
    .attr("opacity", 0)
    .attr("fill", d => colorMap[d.team].primary)
    .text((d, i) => `${d.rawSuccess}`);

  games
    .selectAll(".team")
    .data(d => d)
    .join("rect")
    .attr("x", -MATCH_WIDTH / 2)
    .attr("y", (d, i) => (i % 2 === 0 ? gameScale(100) : gameScale(d.success)))
    .attr("height", d => gameScale(100 - d.success))
    .attr("width", MATCH_WIDTH)
    .attr("fill", d => colorMap[d.team].primary)
    .attr("fill-opacity", 1)
    .attr("stroke", "white")
    .on("mouseover", (event, data) => {
      highlightPath(data, gameScale, xScale, yScale);
      setTooltip(event, data);
    })
    .on("mouseout", (event, data) => {
      g.selectAll(".highlight").data([]).join("path").attr("class", "highlight");
      g.selectAll(".team").attr("opacity", 1);
      g.selectAll(".teamLabel").attr("opacity", 1).attr("font-weight", "normal");
      g.selectAll(".winPercentageLabel").attr("opacity", 0);

      tooltip.style("visibility", "hidden");
    })
    .attr("class", "team");

  const areaGame = d3
    .area()
    .x(d => d.x)
    .y0(d => d.y0)
    .y1(d => d.y1)
    .curve(d3.curveMonotoneX);

  const buildHighlight = (team, gameScale, xScale, yScale) => {
    const teamData = data.filter(match => match.teamANickname === team || match.teamBNickname === team);
    return teamData
      .map(d => {
        const teamAccessor = d.teamANickname === team ? "teamASuccess" : "teamBSuccess";
        const isTopTeam = teamAccessor === "teamASuccess";
        return [
          {
            x: xScale(d.week) + xScale.bandwidth() / 2 - MATCH_WIDTH / 2,
            y0: yScale(d.game) + (isTopTeam ? gameScale(100) : gameScale(d[teamAccessor])),
            y1: yScale(d.game) + (isTopTeam ? gameScale(100 - d[teamAccessor]) : gameScale(0)),
          },
          {
            x: xScale(d.week) + xScale.bandwidth() / 2 + MATCH_WIDTH / 2,
            y0: yScale(d.game) + (isTopTeam ? gameScale(100) : gameScale(d[teamAccessor])),
            y1: yScale(d.game) + (isTopTeam ? gameScale(100 - d[teamAccessor]) : gameScale(0)),
          },
        ];
      })
      .flat();
  };

  const highlightPath = (selectedData, gameScale, xScale, yScale) => {
    const { team, oppTeam, idx } = selectedData;
    const g = d3.select(".plotGroup");
    const highlightData = buildHighlight(team, gameScale, xScale, yScale);
    const games = data.filter(d => d.teamANickname === team || d.teamBNickname === team).map(d => d.idx);

    g.selectAll(".highlight")
      .data([highlightData])
      .join("path")
      .attr("class", "highlight")
      .attr("d", d => areaGame(d))
      .attr("fill", d => colorMap[team].primary)
      .attr("fill-opacity", 0.3)
      .lower();
    g.selectAll(".team").attr("opacity", d => (games.includes(d.idx) ? 1 : 0));
    g.selectAll(".teamLabel")
      .attr("opacity", d => (games.includes(d.idx) ? 1 : 0.1))
      .attr("font-weight", d => (games.includes(d.idx) ? "600" : "normal"));
    g.selectAll(".winPercentageLabel")
      .attr("opacity", d => (games.includes(d.idx) ? 1 : 0))
      .attr("font-weight", d => (games.includes(d.idx) ? "600" : "normal"));
  };

  const tooltip = d3
    .select("#chart")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("pointer-events", "none")
    .style("background-color", "#ECF0F1")
    .style("border-color", "#aaa")
    .style("border-radius", "10px");

  const setTooltip = (event, data) => {
    const { team, oppTeam, rawSuccess, rawOppTeamSuccess } = data;
    const logoBaseURL = team => `https://sportsbook.draftkings.com/static/logos/teams/nfl/${team}.png`;
    const teamLinkImage = `<image xlink:href=${logoBaseURL(team)} width="25" height="25"/>`;
    const oppTeamLinkImage = `<image xlink:href=${logoBaseURL(oppTeam)} width="25" height="25"/>`;

    tooltip
      .style("top", event.pageY + 20 + "px")
      .style("left", event.pageX - 65 + "px")
      .style("visibility", "visible").html(`
            <div class="info-column info-stat" style="color: ${colorMap[team].primary}; float: left; width: 50px; margin-left: 20px">
              <p class="text-lg">${team}</p>
              <svg width="25" height="25">       
                ${teamLinkImage}
              </svg>
              <p class="text-lg">${rawSuccess}</p>
            </div>
            <div class="info-column" style="float: left; width: 50px; height: 50px">
              <br>
              <br>
              <p class="text-sm">   VS   </p>
              <br>
            </div>
            <div class="info-column info-stat" style="color: ${colorMap[oppTeam].primary}; float: left; width: 50px">
              <p class="text-lg">${oppTeam}</p>
              <svg width="25" height="25">       
                ${oppTeamLinkImage}  
              </svg>
              <p class="text-lg">${rawOppTeamSuccess}</p>
            </div>
          `);
  };

  Object.keys(TEAMS).forEach(team => {
    const form = document.getElementById("team-form");
    const entry = document.createElement("option");
    entry.text = team;
    form.add(entry);
  });

  const selector = document.getElementById("team-form");
  selector.addEventListener("change", () => {
    const currentValue = selector.value;
    const team = TEAMS[currentValue];
    highlightPath({ team }, gameScale, xScale, yScale);
  });
})();
