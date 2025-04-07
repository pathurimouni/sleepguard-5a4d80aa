
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Database, Upload, Download, Trash2, FileUp, 
  AlertTriangle, Info, Shield, Loader2, Search
} from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCurrentUser } from "@/utils/auth";
import { supabase } from "@/integrations/supabase/client";

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  is_public: boolean;
  labels: {
    apnea: number;
    normal: number;
  };
  created_by: string;
}

interface FileUploadState {
  file: File | null;
  name: string;
  description: string;
  isPublic: boolean;
  isUploading: boolean;
  progress: number;
}

const AdminDatasets: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    name: "",
    description: "",
    isPublic: false,
    isUploading: false,
    progress: 0
  });
  const [deleteDatasetId, setDeleteDatasetId] = useState<string | null>(null);
  
  // Check admin access and load datasets
  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true);
        
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          toast.error("You must be logged in to access this page");
          navigate("/login");
          return;
        }
        
        setUser(currentUser);
        
        // Check if user is admin
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('role', 'admin')
          .single();
        
        if (error || !data) {
          toast.error("You don't have permission to access this page");
          navigate("/");
          return;
        }
        
        setIsAdmin(true);
        
        // Load datasets
        await loadDatasets();
      } catch (error) {
        console.error("Error checking access:", error);
        toast.error("Error accessing admin panel");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, []);
  
  // Filter datasets when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDatasets(datasets);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = datasets.filter(dataset => 
      dataset.name.toLowerCase().includes(term) || 
      (dataset.description && dataset.description.toLowerCase().includes(term))
    );
    
    setFilteredDatasets(filtered);
  }, [searchTerm, datasets]);
  
  // Load datasets
  const loadDatasets = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('training_datasets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error loading datasets:", error);
        toast.error("Failed to load datasets");
        return;
      }
      
      setDatasets(data || []);
      setFilteredDatasets(data || []);
    } catch (error) {
      console.error("Error in loadDatasets:", error);
      toast.error("Failed to load datasets");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Auto-generate name from filename
    const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const formattedName = fileName
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
    
    setUploadState(prev => ({
      ...prev,
      file,
      name: formattedName
    }));
  };
  
  // Handle upload form change
  const handleUploadFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setUploadState(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle visibility toggle
  const handleVisibilityToggle = () => {
    setUploadState(prev => ({
      ...prev,
      isPublic: !prev.isPublic
    }));
  };
  
  // Upload dataset
  const uploadDataset = async () => {
    const { file, name, description, isPublic } = uploadState;
    
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }
    
    if (!name) {
      toast.error("Please enter a name for the dataset");
      return;
    }
    
    try {
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        progress: 0
      }));
      
      // Upload file to storage
      const filePath = `datasets/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('training_data')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        toast.error("Failed to upload dataset file");
        return;
      }
      
      setUploadState(prev => ({
        ...prev,
        progress: 50
      }));
      
      // Get file URL
      const { data: urlData } = await supabase.storage
        .from('training_data')
        .createSignedUrl(filePath, 31536000); // 1 year expiry
      
      const fileUrl = urlData?.signedUrl;
      
      // Create dataset record
      const { data: datasetData, error: datasetError } = await supabase
        .from('training_datasets')
        .insert({
          name,
          description,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          is_public: isPublic,
          created_by: user.id,
          labels: {
            apnea: 0,
            normal: 0
          }
        })
        .select();
      
      if (datasetError) {
        console.error("Error creating dataset record:", datasetError);
        toast.error("Failed to create dataset record");
        return;
      }
      
      setUploadState(prev => ({
        ...prev,
        progress: 100
      }));
      
      // Reset form and close dialog
      setTimeout(() => {
        setUploadState({
          file: null,
          name: "",
          description: "",
          isPublic: false,
          isUploading: false,
          progress: 0
        });
        
        setShowUploadDialog(false);
        
        // Reload datasets
        loadDatasets();
        
        toast.success("Dataset uploaded successfully");
      }, 1000);
      
    } catch (error) {
      console.error("Error uploading dataset:", error);
      toast.error("Failed to upload dataset");
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false
      }));
    }
  };
  
  // Delete dataset
  const deleteDataset = async () => {
    if (!deleteDatasetId) return;
    
    try {
      // Get dataset info
      const { data: datasetData, error: datasetError } = await supabase
        .from('training_datasets')
        .select('file_path')
        .eq('id', deleteDatasetId)
        .single();
      
      if (datasetError) {
        console.error("Error fetching dataset:", datasetError);
        toast.error("Failed to fetch dataset information");
        return;
      }
      
      // Delete file from storage
      const { error: deleteFileError } = await supabase.storage
        .from('training_data')
        .remove([datasetData.file_path]);
      
      if (deleteFileError) {
        console.error("Error deleting file:", deleteFileError);
        toast.error("Failed to delete dataset file");
      }
      
      // Delete dataset record
      const { error: deleteRecordError } = await supabase
        .from('training_datasets')
        .delete()
        .eq('id', deleteDatasetId);
      
      if (deleteRecordError) {
        console.error("Error deleting dataset record:", deleteRecordError);
        toast.error("Failed to delete dataset record");
        return;
      }
      
      // Clear delete state
      setDeleteDatasetId(null);
      
      // Reload datasets
      loadDatasets();
      
      toast.success("Dataset deleted successfully");
    } catch (error) {
      console.error("Error deleting dataset:", error);
      toast.error("Failed to delete dataset");
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Download dataset
  const downloadDataset = async (dataset: Dataset) => {
    try {
      // Get download URL
      const { data, error } = await supabase.storage
        .from('training_data')
        .createSignedUrl(dataset.file_path, 3600);
      
      if (error) {
        console.error("Error getting download URL:", error);
        toast.error("Failed to generate download link");
        return;
      }
      
      // Open download link
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Error downloading dataset:", error);
      toast.error("Failed to download dataset");
    }
  };
  
  // Render upload dialog
  const renderUploadDialog = () => {
    return (
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Training Dataset</DialogTitle>
            <DialogDescription>
              Upload audio files for apnea detection model training.
              Supported formats: .wav, .mp3, .ogg, .flac, .zip
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dataset-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp className="w-8 h-8 mb-2 text-slate-500" />
                  <p className="mb-1 text-sm text-slate-500">
                    {uploadState.file 
                      ? uploadState.file.name 
                      : "Click to select or drag and drop"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {uploadState.file
                      ? `${formatFileSize(uploadState.file.size)}`
                      : "Audio files or ZIP archives"}
                  </p>
                </div>
                <input 
                  id="dataset-file" 
                  type="file" 
                  className="hidden" 
                  accept=".wav,.mp3,.ogg,.flac,.zip"
                  onChange={handleFileSelect}
                  disabled={uploadState.isUploading}
                />
              </label>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="dataset-name" className="text-sm font-medium">
                Dataset Name
              </label>
              <Input
                id="dataset-name"
                name="name"
                value={uploadState.name}
                onChange={handleUploadFormChange}
                placeholder="e.g., Apnea Dataset 2023"
                disabled={uploadState.isUploading}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="dataset-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="dataset-description"
                name="description"
                value={uploadState.description}
                onChange={handleUploadFormChange}
                placeholder="Brief description of the dataset"
                disabled={uploadState.isUploading}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-public"
                checked={uploadState.isPublic}
                onChange={handleVisibilityToggle}
                disabled={uploadState.isUploading}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is-public" className="text-sm">
                Make dataset publicly accessible
              </label>
            </div>
            
            {uploadState.isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Uploading...</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div 
                    className="bg-primary h-1.5 rounded-full" 
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={uploadState.isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={uploadDataset}
              disabled={!uploadState.file || !uploadState.name || uploadState.isUploading}
            >
              {uploadState.isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                "Upload Dataset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render delete confirmation dialog
  const renderDeleteDialog = () => {
    return (
      <Dialog 
        open={!!deleteDatasetId} 
        onOpenChange={(open) => !open && setDeleteDatasetId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Dataset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dataset? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 rounded-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
              <div className="text-sm text-red-700 dark:text-red-400">
                Deleting this dataset will remove it from storage and any models trained on it may no longer function properly.
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDatasetId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteDataset}
            >
              Delete Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render dataset cards
  const renderDatasetCards = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (filteredDatasets.length === 0) {
      return (
        <div className="text-center py-8">
          <Database className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <h3 className="text-lg font-medium mb-1">No Datasets Found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {searchTerm ? "No datasets match your search criteria" : "Upload datasets to train AI models"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowUploadDialog(true)}>
              Upload Dataset
            </Button>
          )}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDatasets.map(dataset => (
          <Card key={dataset.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-lg">{dataset.name}</h3>
              {dataset.is_public && (
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Shield size={12} />
                  <span>Public</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {dataset.description || "No description available"}
            </p>
            
            <div className="grid grid-cols-2 text-xs text-muted-foreground mb-4">
              <div>Size: {formatFileSize(dataset.file_size)}</div>
              <div>Type: {dataset.file_type.split('/')[1]?.toUpperCase() || dataset.file_type}</div>
              <div>Created: {new Date(dataset.created_at).toLocaleDateString()}</div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                Apnea: {dataset.labels.apnea}
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mx-1"></span>
                Normal: {dataset.labels.normal}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => downloadDataset(dataset)}
              >
                <Download size={14} />
                <span>Download</span>
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setDeleteDatasetId(dataset.id)}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };
  
  // Main render
  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-16 pb-24">
        <div className="page-content">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold mb-2"
              >
                Dataset Management
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground"
              >
                Manage training datasets for sleep apnea detection models
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 md:mt-0"
            >
              <Button
                onClick={() => setShowUploadDialog(true)}
                className="flex items-center gap-2"
              >
                <Upload size={16} />
                Upload Dataset
              </Button>
            </motion.div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md flex items-start gap-3 mb-6">
            <Info className="text-yellow-500 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Admin Only Section</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                This section is restricted to administrators. All datasets uploaded here are used for training and testing AI models for sleep apnea detection.
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search datasets..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {renderDatasetCards()}
          {renderUploadDialog()}
          {renderDeleteDialog()}
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminDatasets;
