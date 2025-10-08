// src/types/buildingCode.ts
export type ContentType =
  | "division"
  | "part"
  | "section"
  | "subsection"
  | "article"
  | "sentence"
  | "clause"
  | "subclause";

export interface BuildingCodeItem {
  id: number;
  parent_id: number | null;
  content_type: ContentType;
  page_number: number;
  reference_code: string;
  title: string;
  content_text: string;
  sequence_order: number;
  level?: number;
  path?: number[];
}

export interface HierarchyNode extends BuildingCodeItem {
  children?: HierarchyNode[];
}
