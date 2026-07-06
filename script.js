const performanceData = [
  { week: "S1", volume: 420, conversion: 8.6 },
  { week: "S2", volume: 580, conversion: 10.1 },
  { week: "S3", volume: 760, conversion: 12.4 },
  { week: "S4", volume: 690, conversion: 11.8 },
];

const sectors = [
  { name: "Arras centre", detail: "Flux fort, potentiel immediat", score: 92 },
  { name: "Gare et axes entrants", detail: "Exposition elevee sur horaires pendulaires", score: 84 },
  { name: "Peripherie nord", detail: "Zone a travailler par relances ciblees", score: 71 },
  { name: "Sud agglomeration", detail: "Volume stable, conversion a optimiser", score: 63 },
];

const actions = [
  { title: "Bloquer les renforts terrain", owner: "Responsable secteur", status: "Avant S2" },
  { title: "Mettre a jour le fichier de suivi", owner: "Equipe commerciale", status: "Hebdo" },
  { title: "Comparer objectifs et realises", owner: "Pilotage", status: "Fin juillet" },
];

const chart = document.querySelector("#chart");
const mode = document.querySelector("#viewMode");
const sectorList = document.querySelector("#sectorList");
const actionsList = document.querySelector("#actionsList");
const addAction = document.querySelector("#addAction");

function renderChart() {
  const key = mode.value;
  const max = Math.max(...performanceData.map((item) => item[key]));

  chart.innerHTML = performanceData
    .map((item) => {
      const value = item[key];
      const height = Math.max(12, Math.round((value / max) * 190));
      const label = key === "conversion" ? `${value}%` : value;
      return `
        <div class="bar-wrap">
          <div class="bar" style="height:${height}px">${label}</div>
          <div class="bar-label">${item.week}</div>
        </div>
      `;
    })
    .join("");
}

function renderSectors() {
  sectorList.innerHTML = sectors
    .map(
      (sector) => `
        <div class="sector">
          <div>
            <strong>${sector.name}</strong>
            <span>${sector.detail}</span>
            <meter min="0" max="100" value="${sector.score}"></meter>
          </div>
          <div class="score">${sector.score}</div>
        </div>
      `,
    )
    .join("");
}

function renderActions() {
  actionsList.innerHTML = actions
    .map(
      (action) => `
        <div class="action">
          <div>
            <strong>${action.title}</strong>
            <span>${action.owner}</span>
          </div>
          <div class="score">${action.status}</div>
        </div>
      `,
    )
    .join("");
}

mode.addEventListener("change", renderChart);
addAction.addEventListener("click", () => {
  actions.unshift({
    title: "Nouvelle action a qualifier",
    owner: "A assigner",
    status: "Ouvert",
  });
  renderActions();
});

renderChart();
renderSectors();
renderActions();
