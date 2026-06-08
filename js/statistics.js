import { store } from "./store.js?v=20260608-6";
import { escapeHtml, initShell, toast } from "./ui.js?v=20260608-6";

async function loadStatistics() {
  try {
    await initShell("statistics");
    const statistics = (await store.getStatistics())
      .map((item) => ({
        ...item,
        completion: Number(item.completion || 0),
        duplicates: Number(item.duplicates || 0),
        missing: Number(item.missing || 0)
      }))
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 10);

    document.querySelector("#ranking").innerHTML = statistics.map((item, index) => `
      <tr><td>#${index + 1}</td><td><strong>${escapeHtml(item.display_name)}</strong></td><td>${item.completion}%</td><td>${item.duplicates}</td><td>${item.missing}</td></tr>
    `).join("");

    const labels = statistics.map((item) => item.display_name);
    new Chart(document.querySelector("#completion-chart"), {
      type: "bar",
      data: { labels, datasets: [{ label: "Fortschritt %", data: statistics.map((item) => item.completion), backgroundColor: "#d7ad52", borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100 } } }
    });
    new Chart(document.querySelector("#collection-chart"), {
      type: "doughnut",
      data: {
        labels: ["Doppelte", "Fehlende"],
        datasets: [{ data: [statistics.reduce((sum, item) => sum + item.duplicates, 0), statistics.reduce((sum, item) => sum + item.missing, 0)], backgroundColor: ["#e88b31", "#d94b5d"], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: "68%" }
    });
  } catch (error) {
    toast(error.message, "error");
  }
}

loadStatistics();
