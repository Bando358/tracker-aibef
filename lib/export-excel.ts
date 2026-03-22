import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import type {
  ActiviteReportData,
  RecommandationReportData,
  PointageReportData,
} from "@/lib/actions/rapport.actions";

import {
  STATUT_ACTIVITE_LABELS,
  STATUT_POINTAGE_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";

// ======================== HELPERS ========================

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F4E79" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

const KPI_LABEL_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 11,
};

const KPI_VALUE_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 14,
  color: { argb: "FF1F4E79" },
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function applyHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number): void {
  const row = sheet.getRow(rowNumber);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDER_THIN;
  });
  row.height = 28;
}

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 45): void {
  sheet.columns.forEach((col) => {
    let longest = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > longest) longest = len;
    });
    col.width = Math.min(longest + 2, maxWidth);
  });
}

function addKpiRow(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  label: string,
  value: string | number,
): void {
  const labelCell = sheet.getCell(rowNum, 1);
  labelCell.value = label;
  labelCell.font = KPI_LABEL_FONT;
  labelCell.alignment = { horizontal: "right", vertical: "middle" };

  const valueCell = sheet.getCell(rowNum, 2);
  valueCell.value = value;
  valueCell.font = KPI_VALUE_FONT;
  valueCell.alignment = { horizontal: "left", vertical: "middle" };
}

async function saveWorkbook(wb: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
}

// ======================== ACTIVITE REPORT ========================

export async function exportActiviteReport(data: ActiviteReportData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tracker AIBEF";
  wb.created = new Date();

  // ---------- Sheet: Synthese ----------
  const synthese = wb.addWorksheet("Synthese");

  synthese.mergeCells("A1:D1");
  const titleCell = synthese.getCell("A1");
  titleCell.value = "Rapport Activites - Synthese";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1F4E79" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  synthese.getRow(1).height = 32;

  let row = 3;
  addKpiRow(synthese, row++, "Total activites :", data.total);
  addKpiRow(synthese, row++, "Realisees :", data.realisees);
  addKpiRow(synthese, row++, "En cours :", data.enCours);
  addKpiRow(synthese, row++, "En retard :", data.enRetard);
  addKpiRow(synthese, row++, "Non planifiees :", data.nonPlanifiees);
  addKpiRow(synthese, row++, "Suspendues :", data.suspendues);
  addKpiRow(synthese, row++, "Taux de realisation :", `${data.tauxRealisation}%`);

  // Repartition par statut
  row += 2;
  synthese.getCell(row, 1).value = "Repartition par statut";
  synthese.getCell(row, 1).font = { bold: true, size: 13 };
  row++;
  synthese.getRow(row).values = ["Statut", "Nombre"];
  applyHeaderRow(synthese, row);
  row++;
  for (const item of data.parStatut) {
    synthese.getRow(row).values = [
      STATUT_ACTIVITE_LABELS[item.label] ?? item.label,
      item.count,
    ];
    synthese.getRow(row).eachCell((c) => { c.border = BORDER_THIN; });
    row++;
  }

  // Par projet
  row += 2;
  synthese.getCell(row, 1).value = "Statistiques par projet";
  synthese.getCell(row, 1).font = { bold: true, size: 13 };
  row++;
  synthese.getRow(row).values = ["Code", "Projet", "Total", "Realisees", "Taux (%)"];
  applyHeaderRow(synthese, row);
  row++;
  for (const p of data.parProjet) {
    synthese.getRow(row).values = [p.code, p.nom, p.total, p.realisees, `${p.taux}%`];
    synthese.getRow(row).eachCell((c) => { c.border = BORDER_THIN; });
    row++;
  }

  autoFitColumns(synthese);

  // ---------- Sheet: Detail ----------
  const detail = wb.addWorksheet("Detail");

  detail.mergeCells("A1:H1");
  const detailTitle = detail.getCell("A1");
  detailTitle.value = "Rapport Activites - Detail";
  detailTitle.font = { bold: true, size: 16, color: { argb: "FF1F4E79" } };
  detailTitle.alignment = { horizontal: "center", vertical: "middle" };
  detail.getRow(1).height = 32;

  const detailHeaders = [
    "Titre",
    "Projet (code)",
    "Projet (nom)",
    "Statut",
    "Antennes",
    "Periodes",
    "Periodes realisees",
    "Budget",
  ];
  detail.getRow(3).values = detailHeaders;
  applyHeaderRow(detail, 3);

  let dRow = 4;
  for (const a of data.activites) {
    detail.getRow(dRow).values = [
      a.titre,
      a.projetCode ?? "-",
      a.projetNom ?? "-",
      STATUT_ACTIVITE_LABELS[a.statut] ?? a.statut,
      a.antennes.join(", "),
      a.nbPeriodes,
      a.nbPeriodesRealisees,
      a.budget ?? 0,
    ];
    detail.getRow(dRow).eachCell((c) => { c.border = BORDER_THIN; });
    dRow++;
  }

  // Format budget column as number
  detail.getColumn(8).numFmt = "#,##0";

  autoFitColumns(detail);

  await saveWorkbook(wb, `rapport_activites_${todayString()}.xlsx`);
}

// ======================== RECOMMANDATION REPORT ========================

export async function exportRecommandationReport(data: RecommandationReportData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tracker AIBEF";
  wb.created = new Date();

  // ---------- Sheet: Synthese ----------
  const synthese = wb.addWorksheet("Synthese");

  synthese.mergeCells("A1:D1");
  const titleCell = synthese.getCell("A1");
  titleCell.value = "Rapport Recommandations - Synthese";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1F4E79" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  synthese.getRow(1).height = 32;

  let row = 3;
  addKpiRow(synthese, row++, "Total recommandations :", data.total);
  addKpiRow(synthese, row++, "Resolues :", data.resolues);
  addKpiRow(synthese, row++, "En cours :", data.enCours);
  addKpiRow(synthese, row++, "En retard :", data.enRetard);
  addKpiRow(synthese, row++, "En attente :", data.enAttente);
  addKpiRow(synthese, row++, "Taux de resolution :", `${data.tauxResolution}%`);

  // Par priorite
  row += 2;
  synthese.getCell(row, 1).value = "Repartition par priorite";
  synthese.getCell(row, 1).font = { bold: true, size: 13 };
  row++;
  synthese.getRow(row).values = ["Priorite", "Nombre"];
  applyHeaderRow(synthese, row);
  row++;
  for (const item of data.parPriorite) {
    synthese.getRow(row).values = [item.label, item.count];
    synthese.getRow(row).eachCell((c) => { c.border = BORDER_THIN; });
    row++;
  }

  // Par source
  row += 2;
  synthese.getCell(row, 1).value = "Repartition par source";
  synthese.getCell(row, 1).font = { bold: true, size: 13 };
  row++;
  synthese.getRow(row).values = ["Source", "Nombre"];
  applyHeaderRow(synthese, row);
  row++;
  for (const item of data.parSource) {
    synthese.getRow(row).values = [item.label, item.count];
    synthese.getRow(row).eachCell((c) => { c.border = BORDER_THIN; });
    row++;
  }

  // Par statut
  row += 2;
  synthese.getCell(row, 1).value = "Repartition par statut";
  synthese.getCell(row, 1).font = { bold: true, size: 13 };
  row++;
  synthese.getRow(row).values = ["Statut", "Nombre"];
  applyHeaderRow(synthese, row);
  row++;
  for (const item of data.parStatut) {
    synthese.getRow(row).values = [item.label, item.count];
    synthese.getRow(row).eachCell((c) => { c.border = BORDER_THIN; });
    row++;
  }

  autoFitColumns(synthese);

  // ---------- Sheet: Detail ----------
  const detail = wb.addWorksheet("Detail");

  detail.mergeCells("A1:G1");
  const detailTitle = detail.getCell("A1");
  detailTitle.value = "Rapport Recommandations - Detail";
  detailTitle.font = { bold: true, size: 16, color: { argb: "FF1F4E79" } };
  detailTitle.alignment = { horizontal: "center", vertical: "middle" };
  detail.getRow(1).height = 32;

  const detailHeaders = [
    "Titre",
    "Source",
    "Priorite",
    "Statut",
    "Antenne",
    "Date echeance",
    "Responsables",
  ];
  detail.getRow(3).values = detailHeaders;
  applyHeaderRow(detail, 3);

  let dRow = 4;
  for (const r of data.recommandations) {
    const echeance = r.dateEcheance
      ? new Date(r.dateEcheance).toLocaleDateString("fr-FR")
      : "-";

    detail.getRow(dRow).values = [
      r.titre,
      r.source,
      r.priorite,
      r.statut,
      r.antenne ?? "-",
      echeance,
      r.responsables.join(", "),
    ];
    detail.getRow(dRow).eachCell((c) => { c.border = BORDER_THIN; });
    dRow++;
  }

  autoFitColumns(detail);

  await saveWorkbook(wb, `rapport_recommandations_${todayString()}.xlsx`);
}

// ======================== POINTAGE REPORT ========================

export async function exportPointageReport(data: PointageReportData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tracker AIBEF";
  wb.created = new Date();

  // ---------- Sheet: Recapitulatif ----------
  const recap = wb.addWorksheet("Recapitulatif");

  recap.mergeCells("A1:L1");
  const titleCell = recap.getCell("A1");
  titleCell.value = `Rapport Pointage - ${data.moisLabel}`;
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1F4E79" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  recap.getRow(1).height = 32;

  // KPIs
  let row = 3;
  addKpiRow(recap, row++, "Mois :", data.moisLabel);
  addKpiRow(recap, row++, "Employes :", data.totalEmployes);
  addKpiRow(recap, row++, "Jours ouvrables :", data.totalJoursOuvrables);
  addKpiRow(recap, row++, "Taux de presence :", `${data.tauxPresence}%`);
  addKpiRow(recap, row++, "Total retards :", data.totalRetards);
  addKpiRow(recap, row++, "Total absences :", data.totalAbsences);
  addKpiRow(recap, row++, "Total heures global :", data.totalHeuresGlobal);

  // Repartition par statut pointage
  row += 2;
  recap.getCell(row, 1).value = "Repartition par statut";
  recap.getCell(row, 1).font = { bold: true, size: 13 };
  row++;
  recap.getRow(row).values = ["Statut", "Nombre"];
  applyHeaderRow(recap, row);
  row++;
  for (const item of data.parStatut) {
    recap.getRow(row).values = [
      STATUT_POINTAGE_LABELS[item.label] ?? item.label,
      item.count,
    ];
    recap.getRow(row).eachCell((c) => { c.border = BORDER_THIN; });
    row++;
  }

  // Tableau employes
  row += 2;
  recap.getCell(row, 1).value = "Detail par employe";
  recap.getCell(row, 1).font = { bold: true, size: 13 };
  row++;

  const empHeaders = [
    "Nom",
    "Prenom",
    "Role",
    "Present",
    "Retard",
    "Absent",
    "Conge",
    "Mission",
    "Maladie",
    "Ferie",
    "Total heures",
    "Retard (min)",
    "Moy. arrivee",
    "Moy. depart",
  ];
  recap.getRow(row).values = empHeaders;
  applyHeaderRow(recap, row);
  row++;

  for (const e of data.employes) {
    recap.getRow(row).values = [
      e.nom,
      e.prenom,
      ROLE_LABELS[e.role] ?? e.role,
      e.joursPresent,
      e.joursRetard,
      e.joursAbsent,
      e.joursConge,
      e.joursMission,
      e.joursMaladie,
      e.joursFerie,
      e.totalHeures,
      e.totalRetardMinutes,
      e.moyArrivee ?? "-",
      e.moyDepart ?? "-",
    ];
    recap.getRow(row).eachCell((c) => {
      c.border = BORDER_THIN;
      c.alignment = { horizontal: "center", vertical: "middle" };
    });
    // Left-align name cells
    recap.getCell(row, 1).alignment = { horizontal: "left", vertical: "middle" };
    recap.getCell(row, 2).alignment = { horizontal: "left", vertical: "middle" };
    recap.getCell(row, 3).alignment = { horizontal: "left", vertical: "middle" };
    row++;
  }

  autoFitColumns(recap);

  await saveWorkbook(wb, `rapport_pointage_${todayString()}.xlsx`);
}
