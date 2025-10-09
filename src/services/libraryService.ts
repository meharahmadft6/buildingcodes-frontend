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
}

export const libraryService = new ApiService();
