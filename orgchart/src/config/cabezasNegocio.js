// Vista Persona — mapea líneas de negocio a su cabeza (codigoPosicion raíz).
// DERIVADOS queda comentado a propósito: no tiene caja propia, su gente vive
// suelta bajo Antonio (Presidente) dentro del Comité de Productos Derivados.
export const CABEZAS_NEGOCIO_TEMP = {
  CORPORATIVO: { id: "00001", order: 1, reportFuncional: null },
  BALANCEADO: { id: "00023", order: 2, reportFuncional: "12" },
  CARNICERIA: { id: "00097", order: 3, reportFuncional: "12" },
  CARNICOS: { id: "00003", order: 4, reportFuncional: "12" },
  PECUARIOS: { id: "00003", order: 5, reportFuncional: "12" },
  // DERIVADOS: { id: "01102", order: 6, reportFuncional: "15" },
  MARKETING: { id: "01049", order: 7, reportFuncional: "15" },
  RETAIL: { id: "00671", order: 8, reportFuncional: "15" },
};

export const API_URL_PERSONA =
  "https://mobileqa.liris.com.ec/delportal/wp-json/delportal/v1/get_organigrama_persona";
