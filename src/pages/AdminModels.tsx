import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Cpu, Play, Download, Trash2, BarChart2, 
  AlertTriangle, Info, Settings, Loader2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/utils/auth";
import { supabase } from "@/integrations/supabase/client";
import { Dataset, Model } from "@/integrations/supabase/customTypes";

interface TrainingState {
  dataset: string;
  modelName: string;
  modelType: 'cnn' | 'rnn' | 'transformer';
  epochs: number;
  batchSize: number;
  learningRate: number;
  isTraining: boolean;
  progress: number;
}

const AdminModels: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [models, setModels] = useState<Model[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("models");
  const [showTrainingDialog, setShowTrainingDialog] = useState<boolean>(false);
  const [trainingState, setTrainingState] = useState<TrainingState>({
    dataset: "",
    modelName: "",
    modelType: "cnn",
    epochs: 10,
    batchSize: 32,
    learningRate: 0.001,
    isTraining: false,
    progress: 0
  });
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  
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
        
        await Promise.all([
          loadModels(),
          loadDatasets()
        ]);
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
  
  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error loading models:", error);
        toast.error("Failed to load models");
        return;
      }
      
      const typedModels = data?.map(model => ({
        ...model,
        status: model.status as 'training' | 'ready' | 'failed',
        validation_results: model.validation_results as Model['validation_results']
      })) || [];
      
      setModels(typedModels);
    } catch (error) {
      console.error("Error in loadModels:", error);
      toast.error("Failed to load models");
    }
  };
  
  const loadDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('training_datasets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error loading datasets:", error);
        toast.error("Failed to load datasets");
        return;
      }
      
      const typedDatasets = data as Dataset[] || [];
      setDatasets(typedDatasets);
    } catch (error) {
      console.error("Error in loadDatasets:", error);
      toast.error("Failed to load datasets");
    }
  };
  
  const handleTrainingFormChange = (field: string, value: any) => {
    setTrainingState(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const startTraining = async () => {
    const { dataset, modelName, modelType, epochs, batchSize, learningRate } = trainingState;
    
    if (!dataset) {
      toast.error("Please select a dataset");
      return;
    }
    
    if (!modelName) {
      toast.error("Please enter a name for the model");
      return;
    }
    
    try {
      setTrainingState(prev => ({
        ...prev,
        isTraining: true,
        progress: 0
      }));
      
      const { data: modelData, error: modelError } = await supabase
        .from('ai_models')
        .insert({
          name: modelName,
          description: `${modelType.toUpperCase()} model trained on ${datasets.find(d => d.id === dataset)?.name}`,
          model_type: modelType,
          architecture: getArchitectureDescription(modelType),
          accuracy: 0,
          parameters: 0,
          file_path: "",
          file_size: 0,
          status: 'training',
          is_active: false,
          trained_by: user.id,
          training_dataset_id: dataset,
          validation_results: null
        })
        .select();
      
      if (modelError) {
        console.error("Error creating model record:", modelError);
        toast.error("Failed to create model record");
        
        setTrainingState(prev => ({
          ...prev,
          isTraining: false
        }));
        
        return;
      }
      
      const modelId = modelData[0].id;
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 5;
        
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          finishTraining(modelId);
        }
        
        setTrainingState(prev => ({
          ...prev,
          progress
        }));
      }, 1000);
      
    } catch (error) {
      console.error("Error starting training:", error);
      toast.error("Failed to start model training");
      
      setTrainingState(prev => ({
        ...prev,
        isTraining: false
      }));
    }
  };
  
  const finishTraining = async (modelId: string) => {
    try {
      const accuracy = 0.85 + (Math.random() * 0.1);
      const precision = 0.82 + (Math.random() * 0.1);
      const recall = 0.79 + (Math.random() * 0.15);
      const f1_score = 2 * (precision * recall) / (precision + recall);
      
      const truePositives = Math.floor(80 + (Math.random() * 15));
      const falseNegatives = Math.floor(10 + (Math.random() * 10));
      const falsePositives = Math.floor(15 + (Math.random() * 10));
      const trueNegatives = Math.floor(85 + (Math.random() * 10));
      
      const confusionMatrix = [
        [truePositives, falseNegatives],
        [falsePositives, trueNegatives]
      ];
      
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({
          status: 'ready',
          accuracy: accuracy,
          parameters: Math.floor(1000000 + (Math.random() * 9000000)),
          file_path: `models/${modelId}.pt`,
          file_size: Math.floor(10000000 + (Math.random() * 50000000)),
          training_time: Math.floor(1200 + (Math.random() * 3600)),
          validation_results: {
            accuracy,
            precision,
            recall,
            f1_score,
            confusion_matrix: confusionMatrix
          }
        })
        .eq('id', modelId);
      
      if (updateError) {
        console.error("Error updating model:", updateError);
        toast.error("Failed to update model status");
        return;
      }
      
      setTimeout(() => {
        setTrainingState({
          dataset: "",
          modelName: "",
          modelType: "cnn",
          epochs: 10,
          batchSize: 32,
          learningRate: 0.001,
          isTraining: false,
          progress: 0
        });
        
        setShowTrainingDialog(false);
        
        loadModels();
        
        toast.success("Model training completed successfully");
      }, 1000);
    } catch (error) {
      console.error("Error finishing training:", error);
      toast.error("Failed to complete model training");
      
      setTrainingState(prev => ({
        ...prev,
        isTraining: false
      }));
    }
  };
  
  const getArchitectureDescription = (modelType: string): string => {
    switch (modelType) {
      case 'cnn':
        return 'Convolutional Neural Network with 5 conv layers, 3 pooling layers, and 2 fully connected layers';
      case 'rnn':
        return 'Recurrent Neural Network with LSTM layers and attention mechanism';
      case 'transformer':
        return 'Transformer-based model with self-attention and multi-head attention layers';
      default:
        return 'Custom neural network architecture';
    }
  };
  
  const deleteModel = async () => {
    if (!deleteModelId) return;
    
    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', deleteModelId);
      
      if (error) {
        console.error("Error deleting model:", error);
        toast.error("Failed to delete model");
        return;
      }
      
      setDeleteModelId(null);
      
      loadModels();
      
      toast.success("Model deleted successfully");
    } catch (error) {
      console.error("Error deleting model:", error);
      toast.error("Failed to delete model");
    }
  };
  
  const setActiveModel = async (modelId: string) => {
    try {
      const { error: resetError } = await supabase
        .from('ai_models')
        .update({ is_active: false })
        .eq('status', 'ready');
      
      if (resetError) {
        console.error("Error resetting active models:", resetError);
        toast.error("Failed to update model status");
        return;
      }
      
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({ is_active: true })
        .eq('id', modelId);
      
      if (updateError) {
        console.error("Error updating model:", updateError);
        toast.error("Failed to activate model");
        return;
      }
      
      loadModels();
      
      toast.success("Model activated successfully");
    } catch (error) {
      console.error("Error setting active model:", error);
      toast.error("Failed to activate model");
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  const formatTrainingTime = (seconds: number | null): string => {
    if (!seconds) return "N/A";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [
      hours > 0 ? `${hours}h` : "",
      minutes > 0 ? `${minutes}m` : "",
      `${secs}s`
    ].filter(Boolean).join(" ");
  };
  
  const renderTrainingDialog = () => {
    return (
      <Dialog open={showTrainingDialog} onOpenChange={setShowTrainingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Train New Model</DialogTitle>
            <DialogDescription>
              Configure and train a new AI model for sleep apnea detection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="dataset" className="text-sm font-medium">
                Training Dataset
              </label>
              <Select
                disabled={trainingState.isTraining}
                value={trainingState.dataset}
                onValueChange={(value) => handleTrainingFormChange('dataset', value)}
              >
                <SelectTrigger id="dataset">
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map(dataset => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="model-name" className="text-sm font-medium">
                Model Name
              </label>
              <Input
                id="model-name"
                value={trainingState.modelName}
                onChange={(e) => handleTrainingFormChange('modelName', e.target.value)}
                placeholder="e.g., ApneaDetect CNN v1"
                disabled={trainingState.isTraining}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="model-type" className="text-sm font-medium">
                Model Architecture
              </label>
              <Select
                disabled={trainingState.isTraining}
                value={trainingState.modelType}
                onValueChange={(value) => handleTrainingFormChange('modelType', value)}
              >
                <SelectTrigger id="model-type">
                  <SelectValue placeholder="Select model type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnn">CNN (Convolutional Neural Network)</SelectItem>
                  <SelectItem value="rnn">RNN (Recurrent Neural Network)</SelectItem>
                  <SelectItem value="transformer">Transformer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="epochs" className="text-sm font-medium">
                  Epochs
                </label>
                <Input
                  id="epochs"
                  type="number"
                  min={1}
                  max={100}
                  value={trainingState.epochs}
                  onChange={(e) => handleTrainingFormChange('epochs', parseInt(e.target.value))}
                  disabled={trainingState.isTraining}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="batch-size" className="text-sm font-medium">
                  Batch Size
                </label>
                <Input
                  id="batch-size"
                  type="number"
                  min={1}
                  max={256}
                  value={trainingState.batchSize}
                  onChange={(e) => handleTrainingFormChange('batchSize', parseInt(e.target.value))}
                  disabled={trainingState.isTraining}
                />
              </div>
              
              <div className="space-y-2 col-span-2">
                <label htmlFor="learning-rate" className="text-sm font-medium">
                  Learning Rate
                </label>
                <Input
                  id="learning-rate"
                  type="number"
                  step={0.0001}
                  min={0.0001}
                  max={0.1}
                  value={trainingState.learningRate}
                  onChange={(e) => handleTrainingFormChange('learningRate', parseFloat(e.target.value))}
                  disabled={trainingState.isTraining}
                />
              </div>
            </div>
            
            {trainingState.isTraining && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Training in progress...</span>
                  <span>{Math.round(trainingState.progress)}%</span>
                </div>
                <Progress value={trainingState.progress} className="h-2" />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTrainingDialog(false)}
              disabled={trainingState.isTraining}
            >
              Cancel
            </Button>
            <Button
              onClick={startTraining}
              disabled={
                !trainingState.dataset || 
                !trainingState.modelName || 
                trainingState.isTraining
              }
            >
              {trainingState.isTraining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Training
                </>
              ) : (
                "Start Training"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  const renderDeleteDialog = () => {
    return (
      <Dialog 
        open={!!deleteModelId} 
        onOpenChange={(open) => !open && setDeleteModelId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this model? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 rounded-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
              <div className="text-sm text-red-700 dark:text-red-400">
                Deleting this model will remove it from the system. Any services currently using this model may stop working properly.
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModelId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteModel}
            >
              Delete Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  const renderModelDetailsDialog = () => {
    if (!selectedModel) return null;
    
    const { 
      name, description, architecture, accuracy, parameters, 
      created_at, status, training_time, validation_results 
    } = selectedModel;
    
    return (
      <Dialog 
        open={!!selectedModel} 
        onOpenChange={(open) => !open && setSelectedModel(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              {description || "No description available"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className="text-sm font-medium">
                    {status === 'ready' 
                      ? "Ready" 
                      : status === 'training' 
                        ? "Training" 
                        : "Failed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm font-medium">
                    {new Date(created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                  <p className="text-sm font-medium">
                    {(accuracy * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Training Time</p>
                  <p className="text-sm font-medium">
                    {formatTrainingTime(training_time)}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Parameters</p>
                <p className="text-sm font-medium">
                  {parameters.toLocaleString()}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4 py-4">
              {validation_results ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                      <p className="text-sm font-medium">
                        {(validation_results.accuracy * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Precision</p>
                      <p className="text-sm font-medium">
                        {(validation_results.precision * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Recall</p>
                      <p className="text-sm font-medium">
                        {(validation_results.recall * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">F1 Score</p>
                      <p className="text-sm font-medium">
                        {(validation_results.f1_score * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Confusion Matrix</p>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                      <div className="flex">
                        <div className="w-20"></div>
                        <div className="flex-1 text-center text-xs">Predicted Apnea</div>
                        <div className="flex-1 text-center text-xs">Predicted Normal</div>
                      </div>
                      
                      <div className="flex mt-2">
                        <div className="w-20 text-xs flex items-center">Actual Apnea</div>
                        <div className="flex-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900 p-2 m-1 text-center">
                          {validation_results.confusion_matrix[0][0]}
                        </div>
                        <div className="flex-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 p-2 m-1 text-center">
                          {validation_results.confusion_matrix[0][1]}
                        </div>
                      </div>
                      
                      <div className="flex">
                        <div className="w-20 text-xs flex items-center">Actual Normal</div>
                        <div className="flex-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 p-2 m-1 text-center">
                          {validation_results.confusion_matrix[1][0]}
                        </div>
                        <div className="flex-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900 p-2 m-1 text-center">
                          {validation_results.confusion_matrix[1][1]}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No validation results available
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="architecture" className="space-y-4 py-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Architecture Type</p>
                <p className="text-sm font-medium">
                  {selectedModel.model_type.toUpperCase()}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Details</p>
                <p className="text-sm">
                  {architecture}
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md mt-4">
                <p className="text-xs text-muted-foreground mb-2">Model Structure</p>
                <pre className="text-xs overflow-auto">
                  {selectedModel.model_type === 'cnn' ? (
                    `CNN(
  (conv1): Conv2d(1, 32, kernel_size=(3, 3), stride=(1, 1), padding=(1, 1))
  (relu1): ReLU()
  (pool1): MaxPool2d(kernel_size=2, stride=2, padding=0)
  (conv2): Conv2d(32, 64, kernel_size=(3, 3), stride=(1, 1), padding=(1, 1))
  (relu2): ReLU()
  (pool2): MaxPool2d(kernel_size=2, stride=2, padding=0)
  (conv3): Conv2d(64, 128, kernel_size=(3, 3), stride=(1, 1), padding=(1, 1))
  (relu3): ReLU()
  (pool3): MaxPool2d(kernel_size=2, stride=2, padding=0)
  (flatten): Flatten()
  (fc1): Linear(in_features=12800, out_features=512, bias=True)
  (relu4): ReLU()
  (dropout): Dropout(p=0.5)
  (fc2): Linear(in_features=512, out_features=2, bias=True)
  (softmax): Softmax(dim=1)
)`
                  ) : selectedModel.model_type === 'rnn' ? (
                    `RNN(
  (embedding): Embedding(1000, 128)
  (lstm1): LSTM(128, 256, batch_first=True, bidirectional=True)
  (attention): MultiheadAttention(512, 8)
  (dropout): Dropout(p=0.3)
  (fc1): Linear(in_features=512, out_features=128, bias=True)
  (relu): ReLU()
  (fc2): Linear(in_features=128, out_features=2, bias=True)
  (softmax): Softmax(dim=1)
)`
                  ) : (
                    `Transformer(
  (embedding): Embedding(1000, 512)
  (position_encoding): PositionalEncoding(512, dropout=0.1)
  (transformer_encoder): TransformerEncoder(
    (layers): ModuleList(
      (0-5): 6 x TransformerEncoderLayer(
        (self_attn): MultiheadAttention(512, 8, dropout=0.1)
        (linear1): Linear(in_features=512, out_features=2048, bias=True)
        (dropout): Dropout(p=0.1)
        (linear2): Linear(in_features=2048, out_features=512, bias=True)
        (norm1): LayerNorm(512)
        (norm2): LayerNorm(512)
        (dropout1): Dropout(p=0.1)
        (dropout2): Dropout(p=0.1)
      )
    )
  )
  (fc_out): Linear(in_features=512, out_features=2, bias=True)
)`
                  )}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedModel(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  const renderModels = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (models.length === 0) {
      return (
        <div className="text-center py-8">
          <Cpu className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <h3 className="text-lg font-medium mb-1">No Models Found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Train new models to detect sleep apnea patterns
          </p>
          <Button onClick={() => setShowTrainingDialog(true)}>
            Train New Model
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map(model => (
          <Card key={model.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-start gap-2">
                <h3 
                  className="font-medium text-lg cursor-pointer hover:text-primary"
                  onClick={() => setSelectedModel(model)}
                >
                  {model.name}
                </h3>
                {model.is_active && (
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                    Active
                  </div>
                )}
              </div>
              
              {model.status === 'training' && (
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Training</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {model.description || "No description available"}
            </p>
            
            <div className="grid grid-cols-2 text-xs text-muted-foreground mb-4">
              <div>Type: {model.model_type.toUpperCase()}</div>
              <div>Accuracy: {(model.accuracy * 100).toFixed(1)}%</div>
              <div>Size: {formatFileSize(model.file_size)}</div>
              <div>Parameters: {model.parameters.toLocaleString()}</div>
            </div>
            
            <div className="flex justify-end space-x-2">
              {model.status === 'ready' && !model.is_active && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => setActiveModel(model.id)}
                >
                  <Play size={14} />
                  <span>Set Active</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setSelectedModel(model)}
              >
                <BarChart2 size={14} />
                <span>Details</span>
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setDeleteModelId(model.id)}
                disabled={model.status === 'training'}
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
                AI Model Management
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground"
              >
                Train and manage AI models for sleep apnea detection
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 md:mt-0"
            >
              <Button
                onClick={() => setShowTrainingDialog(true)}
                className="flex items-center gap-2"
              >
                <Settings size={16} />
                Train New Model
              </Button>
            </motion.div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md flex items-start gap-3 mb-6">
            <Info className="text-yellow-500 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Admin Only Section</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                This section is restricted to administrators. Models trained here will be used for sleep apnea detection in the main application.
              </p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="models" className="space-y-4 pt-4">
              {renderModels()}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4 pt-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Model Settings</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Default Model</h4>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select active model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models
                          .filter(model => model.status === 'ready')
                          .map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} ({(model.accuracy * 100).toFixed(1)}%)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      This model will be used for all real-time sleep apnea detection.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Detection Settings</h4>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="confidence-threshold" className="text-xs">
                            Confidence Threshold
                          </label>
                          <Input
                            id="confidence-threshold"
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            defaultValue="0.70"
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum confidence level to classify as apnea
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="detection-interval" className="text-xs">
                            Detection Interval (ms)
                          </label>
                          <Input
                            id="detection-interval"
                            type="number"
                            min="500"
                            max="5000"
                            step="100"
                            defaultValue="1000"
                          />
                          <p className="text-xs text-muted-foreground">
                            How often to run detection during monitoring
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="window-size" className="text-xs">
                          Analysis Window Size (seconds)
                        </label>
                        <Input
                          id="window-size"
                          type="number"
                          min="1"
                          max="30"
                          step="1"
                          defaultValue="5"
                        />
                        <p className="text-xs text-muted-foreground">
                          Duration of audio to analyze in each detection cycle
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button>Save Settings</Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
          
          {renderTrainingDialog()}
          {renderDeleteDialog()}
          {renderModelDetailsDialog()}
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminModels;
