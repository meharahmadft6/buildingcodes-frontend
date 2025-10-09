// src/components/LibraryHome.tsx
import React, { useState, useEffect } from "react";
import {
  Search,
  User,
  Building,
  Filter,
  FileText,
  Globe,
  Type,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { libraryService } from "../services/libraryService";

interface Jurisdiction {
  id: number;
  name: string;
  code: string;
}

interface DocumentType {
  id: number;
  name: string;
  description: string;
}

interface Language {
  id: number;
  code: string;
  name: string;
}

interface PdfDocument {
  id: string;
  title: string;
  year: number;
  version?: string;
  effective_date: string;
  jurisdiction_name: string;
  jurisdiction_code: string;
  document_type_name: string;
  language_name: string;
  file_name: string;
  processing_status: string;
}

const LibraryHome: React.FC = () => {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [pdfDocuments, setPdfDocuments] = useState<PdfDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<PdfDocument[]>([]);

  const [selectedJurisdiction, setSelectedJurisdiction] =
    useState<string>("all");
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<
    Set<string>
  >(new Set(["Codes"]));
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(
    new Set(["English"])
  );
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    jurisdiction: true,
    types: true,
    language: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [
    selectedJurisdiction,
    selectedDocumentTypes,
    selectedLanguages,
    searchTerm,
    pdfDocuments,
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        jurisdictionsRes,
        documentTypesRes,
        languagesRes,
        pdfDocumentsRes,
      ] = await Promise.all([
        libraryService.getJurisdictions(),
        libraryService.getDocumentTypes(),
        libraryService.getLanguages(),
        libraryService.getPdfDocuments(),
      ]);

      setJurisdictions(jurisdictionsRes);
      setDocumentTypes(documentTypesRes);
      setLanguages(languagesRes);
      setPdfDocuments(pdfDocumentsRes);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = pdfDocuments;

    // Filter by jurisdiction
    if (selectedJurisdiction !== "all") {
      filtered = filtered.filter(
        (doc) =>
          doc.jurisdiction_code.toLowerCase() ===
          selectedJurisdiction.toLowerCase()
      );
    }

    // Filter by document type
    if (selectedDocumentTypes.size > 0) {
      filtered = filtered.filter((doc) =>
        selectedDocumentTypes.has(doc.document_type_name)
      );
    }

    // Filter by language
    if (selectedLanguages.size > 0) {
      filtered = filtered.filter((doc) =>
        selectedLanguages.has(doc.language_name)
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.jurisdiction_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          doc.document_type_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocuments(filtered);
  };

  const toggleDocumentType = (typeName: string) => {
    const newSelected = new Set(selectedDocumentTypes);
    if (newSelected.has(typeName)) {
      newSelected.delete(typeName);
    } else {
      newSelected.add(typeName);
    }
    setSelectedDocumentTypes(newSelected);
  };

  const toggleLanguage = (languageName: string) => {
    const newSelected = new Set(selectedLanguages);
    if (newSelected.has(languageName)) {
      newSelected.delete(languageName);
    } else {
      newSelected.add(languageName);
    }
    setSelectedLanguages(newSelected);
  };
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      Codes: "bg-blue-100 text-blue-800",
      Acts: "bg-green-100 text-green-800",
      Standards: "bg-purple-100 text-purple-800",
      Intents: "bg-orange-100 text-orange-800",
      Guides: "bg-indigo-100 text-indigo-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
    

      <div className="max-w-8xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-black" />
                  <h2 className="text-lg font-semibold text-black">FILTERS</h2>
                </div>
              </div>

              {/* Jurisdiction Filter */}
              <div className="border-b border-gray-200">
                <button
                  className="flex items-center justify-between w-full p-6 text-left"
                  onClick={() => toggleSection("jurisdiction")}
                >
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-black" />
                    <span className="font-medium text-black">Jurisdiction</span>
                  </div>
                  {expandedSections.jurisdiction ? (
                    <ChevronUp className="h-4 w-4 text-black" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-black" />
                  )}
                </button>
                {expandedSections.jurisdiction && (
                  <div className="pb-4 px-6">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedJurisdiction("all")}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-all border ${
                          selectedJurisdiction === "all"
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-gray-300 hover:border-black"
                        }`}
                      >
                        All
                      </button>
                      {jurisdictions
                        .filter((j) => j.name !== "All")
                        .map((jurisdiction) => (
                          <button
                            key={jurisdiction.id}
                            onClick={() =>
                              setSelectedJurisdiction(jurisdiction.code)
                            }
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all border ${
                              selectedJurisdiction === jurisdiction.code
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-300 hover:border-black"
                            }`}
                          >
                            {jurisdiction.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Document Types Filter */}
              <div className="border-b border-gray-200">
                <button
                  className="flex items-center justify-between w-full p-6 text-left"
                  onClick={() => toggleSection("types")}
                >
                  <div className="flex items-center space-x-2">
                    <Type className="h-4 w-4 text-black" />
                    <span className="font-medium text-black">Types</span>
                  </div>
                  {expandedSections.types ? (
                    <ChevronUp className="h-4 w-4 text-black" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-black" />
                  )}
                </button>
                {expandedSections.types && (
                  <div className="pb-4 px-6">
                    <div className="flex flex-wrap gap-2">
                      {documentTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => toggleDocumentType(type.name)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all border ${
                            selectedDocumentTypes.has(type.name)
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-gray-300 hover:border-black"
                          }`}
                        >
                          {type.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Language Filter */}
              <div className="border-b border-gray-200">
                <button
                  className="flex items-center justify-between w-full p-6 text-left"
                  onClick={() => toggleSection("language")}
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-black" />
                    <span className="font-medium text-black">Language</span>
                  </div>
                  {expandedSections.language ? (
                    <ChevronUp className="h-4 w-4 text-black" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-black" />
                  )}
                </button>
                {expandedSections.language && (
                  <div className="pb-4 px-6">
                    <div className="flex flex-wrap gap-2">
                      {languages.map((language) => (
                        <button
                          key={language.id}
                          onClick={() => toggleLanguage(language.name)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all border ${
                            selectedLanguages.has(language.name)
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-gray-300 hover:border-black"
                          }`}
                        >
                          {language.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Results Count */}
              <div className="p-6">
                <p className="text-sm text-black">
                  Showing {filteredDocuments.length} of {pdfDocuments.length}{" "}
                  documents
                </p>
              </div>
            </div>
          </div>
          {/* Documents List */}
          <div className="lg:w-3/4">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-black">Documents</h2>
              </div>

              <div className="p-6">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-black mb-2">
                      No documents found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your filters or search terms to find what
                      you're looking for.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="border border-gray-200 rounded-lg p-6 hover:border-black transition-colors cursor-pointer group"
                        onClick={() => {
                          window.location.href = `/document/${document.id}`;
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(
                                  document.document_type_name
                                )}`}
                              >
                                {document.document_type_name}
                              </span>
                              <span className="text-sm text-black font-medium">
                                {document.jurisdiction_name}
                              </span>
                              <span className="text-sm text-gray-600">
                                {document.year}
                              </span>
                            </div>

                            <h3 className="text-lg font-semibold text-black mb-2 group-hover:text-blue-600 transition-colors">
                              {document.title}
                            </h3>

                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <BookOpen className="h-4 w-4" />
                                <span>{document.language_name}</span>
                              </div>
                              {document.effective_date && (
                                <div className="flex items-center space-x-2">
                                  <span>
                                    Effective:{" "}
                                    {formatDate(document.effective_date)}
                                  </span>
                                </div>
                              )}
                              {document.version && (
                                <span>Version: {document.version}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                document.processing_status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {document.processing_status}
                            </span>
                            <div className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-black transition-colors"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryHome;
