// src/services/libraryService.ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

class ApiService {
  private async fetchWithErrorHandling(url: string, options: RequestInit = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Convert camelCase to snake_case for search results
  private convertSearchResults(results: any[]): any[] {
    return results.map((result) => ({
      id: result.id,
      parent_id: result.parentId,
      content_type: result.contentType,
      page_number: result.pageNumber,
      reference_code: result.referenceCode,
      title: result.title,
      content_text: result.contentText,
      sequence_order: result.sequenceOrder,
      pdf_document_id: result.pdfDocumentId,
      font_family: result.fontFamily,
      font_size: result.fontSize,
      bbox: result.bbox,
      y_coordinate: result.yCoordinate,
      document_title: result.document_title,
      jurisdiction_name: result.jurisdiction_name,
      document_type_name: result.document_type_name,
      year: result.year,
    }));
  }

  async getJurisdictions() {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/jurisdictions`);
  }

  async getDocumentTypes() {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/document-types`);
  }

  async getLanguages() {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/languages`);
  }

  async getPdfDocuments() {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/pdf-documents`);
  }

  async getPdfDocumentById(id: string) {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/pdf-documents/${id}`);
  }

  async getPdfDocumentContent(id: string) {
    return this.fetchWithErrorHandling(
      `${API_BASE_URL}/pdf-documents/${id}/content`
    );
  }

  async searchContent(
    query: string,
    documentId?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });

    if (documentId) {
      params.append("documentId", documentId);
    }

    const response = await this.fetchWithErrorHandling(
      `${API_BASE_URL}/search?${params}`
    );

    // Convert the results to snake_case for frontend compatibility
    return {
      ...response,
      results: this.convertSearchResults(response.results),
    };
  }
}

export const libraryService = new ApiService();
