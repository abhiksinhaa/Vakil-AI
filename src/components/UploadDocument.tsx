'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

// Helper to format bytes
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper to format "time ago"
function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return 'just now';
}

export default function UploadDocument() {
  const router = useRouter();
  const { session } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch recent uploads
  useEffect(() => {
    const fetchRecentUploads = async () => {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase
          .from('drafts')
          .select('id, draft_type, party1_name, party2_name, situation, created_at')
          .in('draft_type', ['_TMP_UPLOAD_', 'Uploaded Document'])
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (data && !error) {
          setRecentUploads(data);
        }
      } catch (err) {
        console.error('Failed to fetch recent uploads', err);
      } finally {
        setLoadingUploads(false);
      }
    };
    
    fetchRecentUploads();
  }, [session?.user?.id]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (Gemini currently handles PDF best via inline data)
    if (file.type !== 'application/pdf') {
      setErrorMessage('Unsupported file type. Please upload a PDF document.');
      setUploadState('error');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File is too large. Maximum supported size is 10 MB.');
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    startUploadFlow(file);
  };

  const startUploadFlow = async (file: File) => {
    if (!session?.user?.id) {
      setErrorMessage('Please log in to upload documents.');
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(10); // Start progress

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const uniqueId = crypto.randomUUID();
      const filePath = `${session.user.id}/${uniqueId}.${fileExt}`;

      setUploadProgress(40);
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw new Error('Failed to upload file to storage.');

      setUploadProgress(70);
      setUploadState('processing');

      // 2. Insert record into drafts table as '_TMP_UPLOAD_'
      const payload = {
        user_id: session.user.id,
        draft_type: '_TMP_UPLOAD_',
        party1_name: file.name, // original filename
        party2_name: formatBytes(file.size), // formatted size
        situation: file.type, // mime type
        amount: filePath, // storage path
        generated_draft: '', // To be filled later or processed on the fly
        created_at: new Date().toISOString(),
      };

      const { data, error: dbError } = await supabase
        .from('drafts')
        .insert(payload)
        .select()
        .single();

      if (dbError) throw new Error('Failed to register uploaded document.');

      setUploadProgress(100);
      
      // 3. Navigate to Document Workspace
      setTimeout(() => {
        router.push(`/workspace/${data.id}`);
      }, 500);

    } catch (err: any) {
      console.error('Upload flow failed:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during upload.');
      setUploadState('error');
      setSelectedFile(null);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setErrorMessage('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col pb-24">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="font-display text-3xl text-cream mb-2">Upload Document</h1>
          <p className="text-cream/60 text-sm leading-relaxed">
            Upload a legal document and let Draftee help you understand, analyze and organize it.
          </p>
        </div>

        {/* Upload Area */}
        <div className="mb-10">
          {uploadState === 'idle' || uploadState === 'error' ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`
                bg-card border-2 border-dashed rounded-3xl p-8 
                flex flex-col items-center justify-center text-center cursor-pointer
                transition-all duration-200 group
                ${uploadState === 'error' ? 'border-red-500/50 bg-red-500/5' : 'border-border hover:border-gold/50 hover:bg-card-elevated'}
              `}
            >
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors
                ${uploadState === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-gold/10 text-gold group-hover:bg-gold/20'}
              `}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              
              <h3 className="text-cream font-medium text-lg mb-1">
                Upload your legal document
              </h3>
              <p className="text-cream/50 text-sm mb-6">
                PDF supported (Max 10 MB)
              </p>

              <button className="rounded-full bg-card-elevated border border-border px-6 py-2.5 text-sm font-medium text-cream group-hover:border-gold/50 transition-colors">
                Choose File
              </button>
              
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf"
                className="hidden"
              />
            </div>
          ) : (
            /* Uploading State */
            <div className="bg-card border border-border rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center shrink-0">
                  {uploadState === 'processing' ? (
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-cream font-medium text-base truncate">
                    {selectedFile?.name}
                  </h3>
                  <p className="text-cream/50 text-sm">
                    {uploadState === 'uploading' ? 'Uploading Document...' : 'Processing...'}
                  </p>
                </div>
                <span className="text-gold font-medium text-sm">
                  {uploadProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-navy rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gold rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              
              <p className="text-cream/40 text-xs text-center mb-4">
                Please don't close this screen.
              </p>

              {uploadState === 'uploading' && (
                <button 
                  onClick={cancelUpload}
                  className="w-full py-2.5 rounded-xl border border-border text-cream/70 text-sm font-medium hover:bg-card-elevated hover:text-cream transition-colors"
                >
                  Cancel Upload
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-red-400 font-medium text-sm mb-1">Upload Failed</h4>
                <p className="text-red-400/80 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Uploads */}
        {recentUploads.length > 0 && uploadState === 'idle' && (
          <div className="space-y-4">
            <h2 className="text-cream/50 uppercase tracking-wider text-xs font-semibold px-1">
              Recent Uploads
            </h2>
            
            <div className="space-y-3">
              {recentUploads.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => router.push(`/workspace/${doc.id}`)}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-gold/30 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center shrink-0 border border-border">
                    <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-cream font-medium text-sm truncate mb-0.5">
                      {doc.party1_name || 'Untitled Document'}
                    </h3>
                    <p className="text-cream/50 text-xs truncate">
                      {doc.draft_type === '_TMP_UPLOAD_' ? 'Unsaved' : 'Saved'} • {timeAgo(doc.created_at)}
                    </p>
                  </div>

                  <svg className="w-5 h-5 text-cream/30 group-hover:text-gold transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
}
