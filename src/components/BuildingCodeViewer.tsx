// src/components/BuildingCodeViewer.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronRight,
  Search,
  Loader2,
  Building,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import { BuildingCodeItem, HierarchyNode } from "@/types/buildingCode";
import {
  buildingCodeService,
  buildHierarchy,
} from "@/services/buildingCodeService";
import { libraryService } from "@/services/libraryService";

interface Reference {
  id: number;
  reference_text: string;
  reference_type: string;
  target_content_id: number;
  target_reference_code: string;
  hyperlink_target: string;
  page_number: number;
  font_family: string;
  bbox: number[];
  reference_position: number;
}

interface BuildingCodeViewerProps {
  documentId?: string;
  documentInfo?: {
    title: string;
    year: number;
    version?: string;
    jurisdiction_name: string;
  };
}

const BuildingCodeViewer: React.FC<BuildingCodeViewerProps> = ({
  documentId,
  documentInfo,
}) => {
  const [data, setData] = useState<HierarchyNode[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<HierarchyNode[]>([]);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const contentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Check if we're in search mode
  const isSearchMode = useMemo(() => {
    return searchTerm.trim().length > 0 && searchResults.length > 0;
  }, [searchTerm, searchResults]);

  useEffect(() => {
    fetchData();
  }, [documentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let flatData: BuildingCodeItem[];

      if (documentId) {
        // Fetch content for specific document
        const contentData = await libraryService.getPdfDocumentContent(
          documentId
        );
        flatData = contentData.content;
      } else {
        // Fallback to original behavior (all content)
        flatData = await buildingCodeService.getHierarchy();
      }

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
        "Failed to load building code data. Please ensure the backend server is running."
      );
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to highlight references in text with purple color
  const highlightReferences = (text: string, references: Reference[] = []) => {
    if (!text || references.length === 0) {
      return <>{text}</>;
    }

    // Sort references by position in text (we'll use reference_position for order)
    const sortedReferences = [...references].sort(
      (a, b) => a.reference_position - b.reference_position
    );

    let lastIndex = 0;
    const elements: JSX.Element[] = [];
    const textLower = text.toLowerCase();

    sortedReferences.forEach((ref, index) => {
      const refText = ref.reference_text;
      const refLower = refText.toLowerCase();

      // Find the reference text in the content text
      const refIndex = textLower.indexOf(refLower, lastIndex);

      if (refIndex !== -1) {
        // Add text before the reference
        if (refIndex > lastIndex) {
          elements.push(
            <span key={`text-${index}`}>
              {text.substring(lastIndex, refIndex)}
            </span>
          );
        }

        // Add the highlighted reference
        elements.push(
          <span
            key={`ref-${index}`}
            className=" text-purple-800 px-1 rounded cursor-pointer  transition-colors borde font-medium"
            title={`Click to view definition of ${refText}`}
            onClick={(e) => {
              e.stopPropagation();
              handleReferenceClick(ref);
            }}
          >
            {text.substring(refIndex, refIndex + refText.length)}
            <ExternalLink size={12} className="inline ml-1" />
          </span>
        );

        lastIndex = refIndex + refText.length;
      }
    });

    // Add remaining text after last reference
    if (lastIndex < text.length) {
      elements.push(<span key="text-final">{text.substring(lastIndex)}</span>);
    }

    return <>{elements}</>;
  };

  // Handle reference click - navigate to target content
  const handleReferenceClick = (reference: Reference) => {
    console.log("Reference clicked:", reference);
    if (reference.target_content_id) {
      navigateToItem(reference.target_content_id);
    } else if (reference.hyperlink_target) {
      // Extract ID from hyperlink target like "#content-480"
      const match = reference.hyperlink_target.match(/#content-(\d+)/);
      if (match) {
        const targetId = parseInt(match[1]);
        navigateToItem(targetId);
      }
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
  };

  const navigateToItem = (id: number) => {
    setSelectedItem(id);

    // Expand all parent nodes to ensure the item is visible
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

    // Scroll to item with a slight delay to ensure DOM is updated
    setTimeout(() => {
      const element = contentRefs.current[id];
      if (element && contentContainerRef.current) {
        // Get the content container
        const container = contentContainerRef.current;

        // Calculate positions relative to the container
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Calculate scroll position
        const scrollPosition =
          container.scrollTop + (elementRect.top - containerRect.top) - 20; // 20px offset

        container.scrollTo({
          top: scrollPosition,
          behavior: "smooth",
        });

        // Add temporary highlight
        element.style.transition = "all 0.3s ease";
        element.style.backgroundColor = "#fef3c7";

        setTimeout(() => {
          element.style.backgroundColor = "";
        }, 2000);
      } else if (!element) {
        console.warn(`Element with id ${id} not found in contentRefs`);
      }
    }, 200);
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
        text: "text-3xl text-black font-normal",
      },
      part: {
        text: "text-2xl text-black font-normal",
      },
      section: {
        text: "text-xl text-black font-normal",
      },
      subsection: {
        text: "text-lg text-black font-normal",
      },
      article: {
        text: "text-lg text-black font-normal",
      },
      sentence: {
        text: "text-sm text-black font-normal",
      },
      clause: {
        text: "text-sm text-black font-normal",
      },
      subclause: {
        text: "text-sm text-black font-normal",
      },
    };

    return styles[type] || { text: "text-sm text-black font-normal" };
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
          onClick={() => {
            console.log(
              "Navigating to item:",
              item.id,
              item.reference_code,
              item.title
            );
            navigateToItem(item.id);
          }}
        >
          {hasChildren && (
            <div
              className=" flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
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
                {/* Show both title and content_text for division, part, section */}
                {(item.content_type === "division" ||
                  item.content_type === "part" ||
                  item.content_type === "section") &&
                  item.title &&
                  item.content_text && (
                    <span className="text-gray-600">
                      {" - "}
                      {item.content_text}
                    </span>
                  )}
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

  const renderContentItem = (item: HierarchyNode, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isHighlighted = selectedItem === item.id;
    const isHovered = hoveredItem === item.id;
    const typeStyles = getTypeStyles(item.content_type);
    const references: Reference[] = (item as any).references || [];

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
            ref={(el) => {
              contentRefs.current[item.id] = el;
            }}
            className={`transition-all duration-200 p-4 rounded-lg  ${
              showHighlight
                ? "bg-blue-50 border-blue-300 shadow-sm"
                : isHovered
                ? "bg-gray-50 border-gray-300 shadow-sm"
                : "bg-white "
            }`}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => navigateToItem(item.id)}
          >
            {(item.reference_code || item.title) && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {item.reference_code && (
                  <span className={` px-2 py-1 rounded  transition-colors`}>
                    {item.reference_code}
                  </span>
                )}

                {item.title && (
                  <h3 className={`${typeStyles.text}`}>
                    {searchTerm
                      ? highlightText(item.title, searchTerm)
                      : item.title}
                  </h3>
                )}
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
          ref={(el) => {
            contentRefs.current[item.id] = el;
          }}
          className={`transition-all duration-200 p-4 rounded-lg  ${
            showHighlight
              ? "bg-blue-50 border-blue-300 shadow-sm"
              : isHovered
              ? "bg-gray-50 border-gray-300 shadow-sm"
              : "bg-white "
          }`}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => navigateToItem(item.id)}
        >
          {(item.reference_code || item.title || item.content_text) && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {item.reference_code && (
                <span className={` px-2 py-1 rounded  transition-colors`}>
                  {item.reference_code}
                </span>
              )}

              {item.title && (
                <h3 className={`${typeStyles.text}`}>
                  {searchTerm
                    ? highlightText(item.title, searchTerm)
                    : item.title}
                </h3>
              )}

              {item.content_text && item.content_text !== item.title && (
                <span className={`${typeStyles.text}`}>
                  {searchTerm
                    ? highlightText(item.content_text, searchTerm)
                    : highlightReferences(item.content_text, references)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Render children outside the box for non-article items */}
        {hasChildren && isExpanded && item.content_type !== "article" && (
          <div className=" ml-4">
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
    const isHighlighted = selectedItem === item.id;
    const isHovered = hoveredItem === item.id;
    const references: Reference[] = (item as any).references || [];

    // Sentences get their own separate block with border
    if (item.content_type === "sentence") {
      return (
        <div
          key={item.id}
          ref={(el) => {
            contentRefs.current[item.id] = el;
          }}
          className={`p-3 border rounded transition-all duration-200 ${
            isHighlighted
              ? "bg-yellow-50 border-yellow-300 shadow-sm"
              : isHovered
              ? "bg-gray-50 border-gray-300"
              : "bg-gray-50 border-gray-200"
          }`}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => navigateToItem(item.id)}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {/* Sentence content with reference highlights */}
              {item.content_text && (
                <div className="text-gray-700 leading-relaxed">
                  {searchTerm
                    ? highlightText(item.content_text, searchTerm)
                    : highlightReferences(item.content_text, references)}
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
      <div
        key={item.id}
        ref={(el) => {
          contentRefs.current[item.id] = el;
        }}
        className="mb-2"
        onClick={() => navigateToItem(item.id)}
      >
        {item.content_text && (
          <div className="text-gray-700 leading-relaxed">
            {searchTerm
              ? highlightText(item.content_text, searchTerm)
              : highlightReferences(item.content_text, references)}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render clauses and subclauses within a sentence
  const renderClauseContent = (item: HierarchyNode, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isHighlighted = selectedItem === item.id;
    const isHovered = hoveredItem === item.id;
    const references: Reference[] = (item as any).references || [];

    if (item.content_type === "clause") {
      return (
        <div
          key={item.id}
          ref={(el) => {
            contentRefs.current[item.id] = el;
          }}
          className={`ml-4 p-2 rounded transition-colors ${
            isHighlighted ? "bg-yellow-50" : isHovered ? "bg-gray-50" : ""
          }`}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={(e) => {
            e.stopPropagation();
            navigateToItem(item.id);
          }}
        >
          {/* Reference code and title in one line */}
          <div className="flex items-start gap-1 ">
            <span className="font-medium text-black shrink-0">
              {item.reference_code}
            </span>
            <span className="text-black leading-relaxed">
              {item.title &&
                (searchTerm
                  ? highlightText(item.title, searchTerm)
                  : highlightReferences(item.title, references))}
            </span>
          </div>

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
        <div
          key={item.id}
          ref={(el) => {
            contentRefs.current[item.id] = el;
          }}
          className={`ml-4 p-1 rounded transition-colors ${
            isHighlighted ? "bg-yellow-50" : isHovered ? "bg-gray-50" : ""
          }`}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={(e) => {
            e.stopPropagation();
            navigateToItem(item.id);
          }}
        >
          {/* For subclauses, you might want similar treatment */}
          <div className="flex items-start gap-1">
            {item.reference_code && (
              <span className="font-medium text-gray-800 shrink-0">
                {item.reference_code}
              </span>
            )}
            <span className="text-gray-700 leading-relaxed">
              {item.content_text &&
                (searchTerm
                  ? highlightText(item.content_text, searchTerm)
                  : highlightReferences(item.content_text, references))}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };
  // Rest of the component remains the same...
  // [Previous code for search results, navigation, etc.]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left side - Document info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-3 rounded-xl shadow-lg flex-shrink-0">
                <Building size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                  {documentInfo?.title || "British Columbia Building Code 2024"}
                </h1>
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {documentInfo?.jurisdiction_name &&
                    `${documentInfo.jurisdiction_name} • `}
                  {documentInfo?.year || "2024"}
                  {documentInfo?.version &&
                    ` • Version ${documentInfo.version}`}
                </p>
              </div>
            </div>

            {/* Right side - Search bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search by title, content, or reference code..."
                  className="w-full pl-12 pr-12 py-3 border text-black border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSearchResults([]);
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Dynamic columns based on search mode */}
      <div
        className={`flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full px-6 py-6 gap-6`}
      >
        {/* Search Results Column - Only shown in search mode */}
        {isSearchMode && (
          <aside className="w-1/4 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-5 py-4 border-b border-blue-200">
              <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                <Search size={16} />
                Search Results
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full ml-1">
                  {searchResults.length}
                </span>
              </h2>
            </div>
            <div className="overflow-y-auto h-full p-2">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className={`flex items-center px-3 py-3 cursor-pointer hover:bg-blue-50 transition-colors rounded-lg mb-1 ${
                    selectedItem === result.id
                      ? "bg-blue-100 border-l-4 border-blue-600"
                      : ""
                  }`}
                  onClick={() => navigateToItem(result.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                      {result.reference_code && (
                        <span className="font-mono text-xs text-blue-600 mr-2">
                          {result.reference_code}
                        </span>
                      )}
                      {result.title || result.content_text?.substring(0, 60)}
                    </div>
                    {result.content_text &&
                      result.content_text !== result.title && (
                        <div className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {searchTerm
                            ? highlightText(
                                result.content_text.substring(0, 100) + "...",
                                searchTerm
                              )
                            : result.content_text.substring(0, 100) + "..."}
                        </div>
                      )}
                    <div className="text-xs text-gray-400 mt-1 capitalize">
                      {result.content_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Navigation Sidebar - Hidden in search mode */}
        {!isSearchMode && (
          <aside className="w-1/4 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
            <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Navigation
              </h2>
            </div>
            <div className="overflow-y-auto h-full p-2">
              {data.map((item) => renderNavigationItem(item))}
            </div>
          </aside>
        )}

        {/* Content Area - Adjusts width based on mode */}
        <main
          className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${
            isSearchMode ? "flex-1" : "w-3/4"
          }`}
        >
          <div ref={contentContainerRef} className="h-full overflow-y-auto">
            <div
              className={`px-8 py-6 ${isSearchMode ? "max-w-4xl mx-auto" : ""}`}
            >
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
                <div>
                  {isSearchMode && (
                    <div className="mb-6 pb-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Search Results for "{searchTerm}"
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Found {searchResults.length} matching items
                      </p>
                    </div>
                  )}
                  {data.map((item) => renderContentItem(item))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BuildingCodeViewer;
