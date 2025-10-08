// src/services/buildingCodeService.ts
import { BuildingCodeItem, HierarchyNode } from "@/types/buildingCode";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const buildingCodeService = {
  async getHierarchy(): Promise<BuildingCodeItem[]> {
    const response = await fetch(`${API_BASE_URL}/building-code/hierarchy`);
    if (!response.ok) {
      throw new Error("Failed to fetch hierarchy");
    }
    return response.json();
  },

  async searchContent(query: string): Promise<BuildingCodeItem[]> {
    const response = await fetch(
      `${API_BASE_URL}/building-code/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error("Failed to search content");
    }
    return response.json();
  },

  async getContentByType(type: string): Promise<BuildingCodeItem[]> {
    const response = await fetch(
      `${API_BASE_URL}/building-code/content/${type}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch content by type");
    }
    return response.json();
  },
};

// Helper function to build hierarchy from flat data
export const buildHierarchy = (
  flatData: BuildingCodeItem[]
): HierarchyNode[] => {
  const map = new Map<number, HierarchyNode>();
  const roots: HierarchyNode[] = [];

  // Initialize all items
  flatData.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  // Build tree structure
  flatData.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      const parent = map.get(item.parent_id)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by sequence_order
  const sortChildren = (nodes: HierarchyNode[]): HierarchyNode[] => {
    return nodes
      .sort((a, b) => a.sequence_order - b.sequence_order)
      .map((node) => ({
        ...node,
        children: node.children ? sortChildren(node.children) : undefined,
      }));
  };

  return sortChildren(roots);
};
