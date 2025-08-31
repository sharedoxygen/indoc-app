import { useState, useEffect, useCallback } from 'react';
import { useGetDocumentsQuery } from '../store/api';

interface ProcessingDocument {
  id: string;
  filename: string;
  fileSize: number;
  uploadedAt: Date;
  status: string;
  virusScanStatus: string;
  currentStage: string;
  overallStatus: 'processing' | 'completed' | 'failed';
}

const getProcessingStages = (status: string, virusScanStatus: string) => {
  const stages = [
    {
      id: 'upload',
      name: 'File Upload',
      icon: 'upload',
      status: 'completed',
      message: 'File uploaded successfully'
    },
    {
      id: 'virus_scan',
      name: 'Security Scan',
      icon: 'security',
      status: virusScanStatus === 'clean' ? 'completed' 
             : virusScanStatus === 'pending' ? 'processing'
             : virusScanStatus === 'infected' ? 'failed' : 'pending',
      message: virusScanStatus === 'clean' ? 'No threats detected'
              : virusScanStatus === 'pending' ? 'Scanning for malware...'
              : virusScanStatus === 'infected' ? 'Threat detected!'
              : 'Waiting for scan...'
    },
    {
      id: 'text_extraction',
      name: 'Content Extraction',
      icon: 'extract',
      status: status === 'indexed' ? 'completed'
             : status === 'processing' ? 'processing'
             : status === 'failed' ? 'failed' : 'pending',
      message: status === 'indexed' ? 'Text extracted successfully'
              : status === 'processing' ? 'Extracting text content...'
              : status === 'failed' ? 'Extraction failed'
              : 'Waiting for processing...'
    },
    {
      id: 'indexing',
      name: 'Search Indexing',
      icon: 'index',
      status: status === 'indexed' ? 'completed' : 'pending',
      message: status === 'indexed' ? 'Available for search & chat' : 'Preparing for search...'
    }
  ];

  // Determine current stage
  let currentStage = 'upload';
  if (virusScanStatus === 'pending') currentStage = 'virus_scan';
  else if (status === 'processing') currentStage = 'text_extraction';
  else if (status === 'uploaded' && virusScanStatus === 'clean') currentStage = 'text_extraction';
  else if (status === 'indexed') currentStage = 'indexing';

  return { stages, currentStage };
};

export const useDocumentProcessing = () => {
  const [processingDocuments, setProcessingDocuments] = useState<ProcessingDocument[]>([]);
  const [lastCheck, setLastCheck] = useState(Date.now());

  // Poll for documents that might be processing
  const { data: documentsData } = useGetDocumentsQuery({
    skip: 0,
    limit: 100,
    sort_by: 'created_at',
    sort_order: 'desc'
  }, {
    pollingInterval: 3000, // Poll every 3 seconds
  });

  useEffect(() => {
    if (!documentsData?.documents) return;

    const now = Date.now();
    const recentCutoff = now - (10 * 60 * 1000); // Last 10 minutes

    // Find documents that are processing or recently uploaded
    const processingDocs = documentsData.documents
      .filter((doc: any) => {
        const uploadTime = new Date(doc.created_at).getTime();
        const isRecent = uploadTime > recentCutoff;
        const needsProcessing = doc.status !== 'indexed' || doc.virus_scan_status === 'pending';
        return isRecent && needsProcessing;
      })
      .map((doc: any) => {
        const { stages, currentStage } = getProcessingStages(doc.status, doc.virus_scan_status);
        
        let overallStatus: 'processing' | 'completed' | 'failed' = 'processing';
        if (doc.status === 'indexed' && doc.virus_scan_status === 'clean') {
          overallStatus = 'completed';
        } else if (doc.status === 'failed' || doc.virus_scan_status === 'infected') {
          overallStatus = 'failed';
        }

        return {
          id: doc.uuid,
          filename: doc.filename,
          fileSize: doc.file_size,
          uploadedAt: new Date(doc.created_at),
          status: doc.status,
          virusScanStatus: doc.virus_scan_status,
          currentStage,
          overallStatus
        };
      });

    setProcessingDocuments(processingDocs);
    setLastCheck(now);
  }, [documentsData]);

  const removeDocument = useCallback((documentId: string) => {
    setProcessingDocuments(prev => prev.filter(doc => doc.id !== documentId));
  }, []);

  const getProcessingSummary = () => {
    const processing = processingDocuments.filter(d => d.overallStatus === 'processing').length;
    const completed = processingDocuments.filter(d => d.overallStatus === 'completed').length;
    const failed = processingDocuments.filter(d => d.overallStatus === 'failed').length;
    
    return { processing, completed, failed, total: processingDocuments.length };
  };

  return {
    processingDocuments,
    removeDocument,
    summary: getProcessingSummary(),
    isActive: processingDocuments.length > 0,
  };
};
