// Expande los nodos fantasma (cabezas invisibles de Carnicería/Cárnicos/
// Pecuarios) tras la carga inicial. El "1 nivel expandido" de la cabeza de
// línea ya se resuelve a nivel de datos en buildTree() (nodosAExpandir),
// antes de chart.load() — acá solo revelamos los fantasmas y sus hijos.
export function expandirFantasmas(chart, lineaFiltro, onListo) {
  const fantasmas = chart.config.nodes
    .filter((n) => {
      if (!n.tags || !n.tags.includes("fantasma")) return false;
      if (String(n.id).includes("CARNICERIA") && lineaFiltro !== "CARNICERIA") return false;
      return true;
    })
    .map((n) => n.id);

  if (fantasmas.length === 0) {
    setTimeout(() => {
      chart.fit();
      if (onListo) onListo();
    }, 200);
    return;
  }

  chart.expand(null, fantasmas, () => {
    fantasmas.forEach((ghostId) => {
      const ghostNode = chart.getNode(ghostId);
      if (ghostNode?.childrenIds?.length > 0) {
        chart.expand(ghostId, ghostNode.childrenIds);
      }
    });
    setTimeout(() => {
      chart.fit();
      if (onListo) onListo();
    }, 200);
  });
}

// chart.getNode() lanza excepción (no devuelve null) si Balkan aún no
// terminó de inicializar su registro interno — más frecuente en pestañas en
// segundo plano, donde el navegador ralentiza los timers. Reintenta con
// backoff en vez de dejar el chart a medio dibujar.
export function postCargaConReintento(
  chart,
  { antonioId, corporativoExpandido, lineaFiltro },
  intentosRestantes = 6,
  onListo,
) {
  try {
    if (corporativoExpandido && antonioId) {
      const antonioNode = chart.getNode(antonioId);
      if (antonioNode && antonioNode.childrenIds && antonioNode.childrenIds.length > 0) {
        chart.expandCollapse(antonioId, antonioNode.childrenIds, [], function () {
          expandirFantasmas(chart, lineaFiltro, onListo);
        });
      } else {
        expandirFantasmas(chart, lineaFiltro, onListo);
      }
    } else {
      expandirFantasmas(chart, lineaFiltro, onListo);
    }
  } catch (e) {
    if (intentosRestantes > 0) {
      setTimeout(
        () =>
          postCargaConReintento(
            chart,
            { antonioId, corporativoExpandido, lineaFiltro },
            intentosRestantes - 1,
            onListo,
          ),
        75,
      );
    } else {
      try {
        expandirFantasmas(chart, lineaFiltro, onListo);
      } catch (e2) {
        console.error("expandirFantasmas también falló:", e2);
        if (onListo) onListo();
      }
    }
  }
}
