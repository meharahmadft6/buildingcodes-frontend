import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronRight,
  Search,
  Loader2,
  Building,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { BuildingCodeItem, HierarchyNode } from "@/types/buildingCode";
import {
  buildingCodeService,
  buildHierarchy,
} from "@/services/buildingCodeService";

const BuildingCodeViewer: React.FC = () => {
  const [data, setData] = useState<HierarchyNode[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<HierarchyNode[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const contentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const flatData = await buildingCodeService.getHierarchy();
      const hierarchicalData = buildHierarchy(flatData);
      setData(hierarchicalData);

      // Auto-expand all items by default
      const allIds = new Set<number>();
      const collectIds = (nodes: HierarchyNode[]) => {
        nodes.forEach((node) => {
          allIds.add(node.id);
          if (node.children) {
            collectIds(node.children);
          }
        });
      };
      collectIds(hierarchicalData);
      setExpandedItems(allIds);
    } catch (err) {
      setError(
        "Failed to load building code data. Please ensure the backend server is running on port 8080."
      );
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Search functionality
  const handleSearch = (term: string) => {
    setSearchTerm(term);

    if (!term.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const results: HierarchyNode[] = [];
    const searchInNodes = (nodes: HierarchyNode[]) => {
      nodes.forEach((node) => {
        const matchesSearch =
          node.title?.toLowerCase().includes(term.toLowerCase()) ||
          node.content_text?.toLowerCase().includes(term.toLowerCase()) ||
          node.reference_code?.toLowerCase().includes(term.toLowerCase());

        if (matchesSearch) {
          results.push(node);
        }

        if (node.children) {
          searchInNodes(node.children);
        }
      });
    };

    searchInNodes(data);
    setSearchResults(results);
    setShowSearchDropdown(results.length > 0);
  };

  const navigateToItem = (id: number) => {
    setSelectedItem(id);
    setShowSearchDropdown(false);

    // Expand parent nodes
    const expandParents = (
      nodes: HierarchyNode[],
      targetId: number,
      parents: number[] = []
    ): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          const newExpanded = new Set(expandedItems);
          parents.forEach((p) => newExpanded.add(p));
          setExpandedItems(newExpanded);
          return true;
        }
        if (node.children) {
          if (expandParents(node.children, targetId, [...parents, node.id])) {
            return true;
          }
        }
      }
      return false;
    };

    expandParents(data, id);

    // Scroll to item
    setTimeout(() => {
      const element = contentRefs.current[id];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight || !text) return text;

    const parts = text.split(new RegExp(`(${highlight})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-300 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };
  const getTypeStyles = (type: string) => {
    const styles: Record<string, { text: string }> = {
      division: {
        text: "text-2xl font-bold text-gray-900",
      },
      part: {
        text: "text-xl font-semibold text-gray-800",
      },
      section: {
        text: "text-lg font-semibold text-gray-800",
      },
      subsection: {
        text: "text-base font-semibold text-gray-700",
      },
      article: {
        text: "text-base font-medium text-gray-700",
      },
      sentence: {
        text: "text-sm font-medium text-gray-700",
      },
      clause: {
        text: "text-sm text-gray-700",
      },
      subclause: {
        text: "text-sm text-gray-700",
      },
    };
    return (
      styles[type] || {
        text: "text-sm text-gray-600",
      }
    );
  };
  // Filter navigation to only show division to articles
  const shouldShowInNavigation = (item: HierarchyNode): boolean => {
    const topLevelTypes = [
      "division",
      "part",
      "section",
      "subsection",
      "article",
    ];
    return topLevelTypes.includes(item.content_type);
  };

  const renderNavigationItem = (item: HierarchyNode, level: number = 0) => {
    // Skip if this item type shouldn't be shown in navigation
    if (!shouldShowInNavigation(item)) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedItem === item.id;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${
            isSelected ? "bg-blue-100 border-l-4 border-blue-600" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => navigateToItem(item.id)}
        >
          {hasChildren && (
            <div
              className="mr-2 flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
              onClick={(e) => toggleExpand(item.id, e)}
            >
              <ChevronRight
                size={14}
                className={`transition-transform ${
                  isExpanded ? "transform rotate-90" : ""
                }`}
              />
            </div>
          )}
          {!hasChildren && <div className="w-6 mr-2"></div>}

          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">
              {item.reference_code && (
                <span className="font-mono text-xs text-gray-500 mr-2">
                  {item.reference_code}
                </span>
              )}
              <span
                className={
                  level === 0 ? "font-semibold text-gray-900" : "text-gray-700"
                }
              >
                {item.title || item.content_text?.substring(0, 50)}
              </span>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) =>
              renderNavigationItem(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const formatClauseContent = (contentType: string, contentText: string) => {
    if (!contentText) return contentText;

    // For clauses and subclauses, use the content_text as is (it already contains the formatted text)
    return contentText;
  };

  const renderContentItem = (item: HierarchyNode, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isHighlighted = selectedItem === item.id;
    const isHovered = hoveredItem === item.id;
    const typeStyles = getTypeStyles(item.content_type);

    // Only show highlight for article-level items, not their children
    const showHighlight =
      isHighlighted &&
      ["division", "part", "section", "subsection", "article"].includes(
        item.content_type
      );

    // For articles, render as a complete box containing all children
    if (item.content_type === "article") {
      return (
        <div key={item.id} className="mb-6">
          <div
            ref={(el) => (contentRefs.current[item.id] = el)}
            className={`transition-all duration-200 p-4 rounded-lg border ${
              showHighlight
                ? "bg-blue-50 border-blue-300 shadow-sm"
                : isHovered
                ? "bg-gray-50 border-gray-300 shadow-sm"
                : "bg-white border-gray-200 shadow-sm"
            }`}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => navigateToItem(item.id)}
          >
            {item.reference_code && (
              <div className="mb-3">
                <span
                  className={`inline-block font-mono text-xs font-semibold px-2 py-1 rounded ${
                    isHovered
                      ? "bg-gray-100 text-gray-700"
                      : "bg-gray-100 text-gray-600"
                  } transition-colors`}
                >
                  {item.reference_code}
                </span>
              </div>
            )}

            {item.title && (
              <h3 className={`${typeStyles.text} mb-3`}>
                {searchTerm
                  ? highlightText(item.title, searchTerm)
                  : item.title}
              </h3>
            )}

            {/* Render article content text */}
            {item.content_text && item.content_text !== item.title && (
              <div className="text-gray-700 leading-relaxed mb-4">
                {searchTerm
                  ? highlightText(item.content_text, searchTerm)
                  : item.content_text}
              </div>
            )}

            {/* Render all sentences as separate blocks within the article */}
            {hasChildren && (
              <div className="space-y-3">
                {item.children!.map((child) => renderArticleChild(child))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Regular block rendering for division, part, section, subsection
    return (
      <div key={item.id} className="mb-6">
        <div
          ref={(el) => (contentRefs.current[item.id] = el)}
          className={`transition-all duration-200 p-4 rounded-lg border ${
            showHighlight
              ? "bg-blue-50 border-blue-300 shadow-sm"
              : isHovered
              ? "bg-gray-50 border-gray-300 shadow-sm"
              : "bg-white border-gray-200 shadow-sm"
          }`}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => navigateToItem(item.id)}
        >
          {item.reference_code && (
            <div className="mb-3">
              <span
                className={`inline-block font-mono text-xs font-semibold px-2 py-1 rounded ${
                  isHovered
                    ? "bg-gray-100 text-gray-700"
                    : "bg-gray-100 text-gray-600"
                } transition-colors`}
              >
                {item.reference_code}
              </span>
            </div>
          )}

          {item.title && (
            <h3 className={`${typeStyles.text} mb-3`}>
              {searchTerm ? highlightText(item.title, searchTerm) : item.title}
            </h3>
          )}

          {item.content_text && item.content_text !== item.title && (
            <div className="text-gray-700 leading-relaxed mb-3">
              {searchTerm
                ? highlightText(item.content_text, searchTerm)
                : item.content_text}
            </div>
          )}

          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.id);
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-2 transition-colors font-medium"
            >
              <ChevronRight
                size={12}
                className={`transition-transform ${
                  isExpanded ? "transform rotate-90" : ""
                }`}
              />
              <span>
                {isExpanded ? "Collapse" : "Expand"} {item.children!.length}{" "}
                items
              </span>
            </button>
          )}
        </div>

        {/* Render children outside the box for non-article items */}
        {hasChildren && isExpanded && item.content_type !== "article" && (
          <div className="mt-4 ml-6">
            {item.children!.map((child) => renderContentItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render children within an article
  const renderArticleChild = (item: HierarchyNode, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    // Sentences get their own separate block with border
    if (item.content_type === "sentence") {
      return (
        <div
          key={item.id}
          className="p-3 bg-gray-50 border border-gray-200 rounded"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {/* Sentence content */}
              {item.content_text && (
                <div className="text-gray-700 leading-relaxed">
                  {searchTerm
                    ? highlightText(item.content_text, searchTerm)
                    : item.content_text}
                </div>
              )}

              {/* Render all clauses and subclauses within this sentence block */}
              {hasChildren && (
                <div className="mt-2 space-y-1">
                  {item.children!.map((child) => renderClauseContent(child))}
                </div>
              )}
            </div>

            {/* Expand/collapse button for sentence */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium flex-shrink-0"
              >
                <ChevronRight
                  size={12}
                  className={`transition-transform ${
                    isExpanded ? "transform rotate-90" : ""
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Default case for non-sentence children
    return (
      <div key={item.id} className="mb-2">
        {item.content_text && (
          <div className="text-gray-700 leading-relaxed">
            {searchTerm
              ? highlightText(item.content_text, searchTerm)
              : item.content_text}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render clauses and subclauses within a sentence
  const renderClauseContent = (item: HierarchyNode, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    if (item.content_type === "clause") {
      return (
        <div key={item.id} className="ml-4">
          {item.content_text && (
            <div className="text-gray-700 leading-relaxed">
              {searchTerm
                ? highlightText(item.content_text, searchTerm)
                : item.content_text}
            </div>
          )}

          {/* Render subclauses */}
          {hasChildren && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map((child) => renderClauseContent(child))}
            </div>
          )}
        </div>
      );
    }

    if (item.content_type === "subclause") {
      return (
        <div key={item.id} className="ml-4">
          {item.content_text && (
            <div className="text-gray-700 leading-relaxed">
              {searchTerm
                ? highlightText(item.content_text, searchTerm)
                : item.content_text}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Building Code
          </h2>
          <p className="text-gray-600">Loading building code data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-[1800px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-3 rounded-xl shadow-lg">
                <Building size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  British Columbia Building Code 2024
                </h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Division A Compliance, Objectives and Functional Statements
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by title, content, or reference code..."
              className="w-full pl-12 pr-12 py-3 border text-black border-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() =>
                searchResults.length > 0 && setShowSearchDropdown(true)
              }
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSearchResults([]);
                  setShowSearchDropdown(false);
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}

            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50">
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-500 px-3 py-2 mb-1 bg-gray-50 rounded-lg">
                    {searchResults.length} results found
                  </div>
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer rounded-lg transition-colors mb-1"
                      onClick={() => navigateToItem(result.id)}
                    >
                      <div className="flex items-start gap-3">
                        {result.reference_code && (
                          <span className="font-mono text-xs text-blue-600 font-semibold flex-shrink-0 bg-blue-50 px-2 py-1 rounded">
                            {result.reference_code}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">
                            {highlightText(
                              result.title || result.content_text || "",
                              searchTerm
                            )}
                          </div>
                          {result.content_text &&
                            result.content_text !== result.title && (
                              <div className="text-xs text-gray-600 line-clamp-2 mt-1">
                                {highlightText(
                                  result.content_text.substring(0, 100) + "...",
                                  searchTerm
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full px-6 py-6 gap-6">
        {/* Left Navigation Sidebar */}
        <aside className="max-w-xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
          <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Navigation
            </h2>
          </div>
          <div className="overflow-y-auto h-full p-2">
            {data.map((item) => renderNavigationItem(item))}
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="max-w-4xl px-8 py-6">
              {data.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">
                    No building code data available.
                  </p>
                </div>
              ) : (
                <div>{data.map((item) => renderContentItem(item))}</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BuildingCodeViewer;
