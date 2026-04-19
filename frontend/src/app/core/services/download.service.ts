import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DownloadService {
  save(blob: Blob, filename: string, contentType?: string | null): void {
    const downloadBlob = contentType && blob.type !== contentType
      ? new Blob([blob], { type: contentType })
      : blob;
    const url = URL.createObjectURL(downloadBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  filenameFromDisposition(disposition: string | null, fallback: string): string {
    if (!disposition) {
      return fallback;
    }

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    if (plainMatch?.[1]) {
      return plainMatch[1];
    }

    return fallback;
  }
}
