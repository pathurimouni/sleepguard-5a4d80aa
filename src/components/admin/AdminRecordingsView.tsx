
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Calendar, Clock, User, AlertTriangle, CheckCircle, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/utils/auth";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RecordingData {
  id: string;
  user_id: string;
  recording_date: string;
  duration: number;
  analysis_complete: boolean;
  recording_file_path: string;
  username?: string;
  is_apnea?: boolean;
  confidence?: number;
  severity?: string;
}

const AdminRecordingsView = () => {
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecording, setSelectedRecording] = useState<RecordingData | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setIsLoading(true);
      
      // Get recordings with join to profiles for username
      const { data, error } = await supabase
        .from('breathing_recordings')
        .select(`
          *,
          profiles:user_id(username)
        `)
        .order('recording_date', { ascending: false });
        
      if (error) {
        console.error("Error fetching recordings:", error);
        toast.error("Failed to load recordings");
        return;
      }
      
      // Get analysis results
      const { data: analysisData, error: analysisError } = await supabase
        .from('apnea_analysis')
        .select('*');
        
      if (analysisError) {
        console.error("Error fetching analysis:", analysisError);
      }
      
      // Format the data
      const formattedData = data.map(item => {
        const analysis = analysisData?.find(a => a.recording_id === item.id);
        return {
          id: item.id,
          user_id: item.user_id,
          recording_date: item.recording_date,
          duration: item.duration,
          analysis_complete: item.analysis_complete,
          recording_file_path: item.recording_file_path,
          username: item.profiles?.username,
          is_apnea: analysis?.is_apnea,
          confidence: analysis?.confidence,
          severity: analysis?.severity
        };
      });
      
      setRecordings(formattedData);
    } catch (error) {
      console.error("Error in recordings fetch:", error);
      toast.error("Failed to load recordings");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteRecording = (recording: RecordingData) => {
    setSelectedRecording(recording);
    setShowDeleteDialog(true);
  };

  const handleDeleteRecording = async () => {
    if (!selectedRecording) return;
    
    try {
      // Delete the recording
      const { error } = await supabase
        .from('breathing_recordings')
        .delete()
        .eq('id', selectedRecording.id);
        
      if (error) {
        throw error;
      }
      
      toast.success("Recording deleted successfully");
      setShowDeleteDialog(false);
      setSelectedRecording(null);
      fetchRecordings();
    } catch (error) {
      console.error("Error deleting recording:", error);
      toast.error("Failed to delete recording");
    }
  };

  const viewRecordingDetails = (recording: RecordingData) => {
    setSelectedRecording(recording);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredRecordings = recordings.filter(recording => 
    recording.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 text-primary" size={20} />
          Breathing Recordings
        </CardTitle>
        <CardDescription>
          View and manage all sleep breathing recordings in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full max-w-sm mb-6">
          <Input
            type="search"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse-breathe text-primary">Loading recordings...</div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Analysis</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecordings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No recordings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecordings.map((recording) => (
                    <TableRow key={recording.id}>
                      <TableCell className="font-medium">{recording.username || 'Unknown User'}</TableCell>
                      <TableCell>{formatDate(recording.recording_date)}</TableCell>
                      <TableCell>{formatDuration(recording.duration)}</TableCell>
                      <TableCell>
                        {recording.analysis_complete ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle size={14} className="mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-500">
                            <AlertTriangle size={14} className="mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {recording.analysis_complete && recording.is_apnea !== undefined ? (
                          recording.is_apnea ? (
                            <Badge variant="destructive">
                              Apnea Detected
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500">
                              Normal
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewRecordingDetails(recording)}
                          >
                            <ExternalLink size={14} />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => confirmDeleteRecording(recording)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Recording Details Dialog */}
        <Dialog 
          open={!!selectedRecording && !showDeleteDialog} 
          onOpenChange={(open) => !open && setSelectedRecording(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Recording Details</DialogTitle>
              <DialogDescription>
                Detailed information about the selected recording
              </DialogDescription>
            </DialogHeader>
            
            {selectedRecording && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center">
                      <User size={16} className="mr-2 text-primary" />
                      User Information
                    </h3>
                    <div className="bg-accent/20 p-3 rounded-md">
                      <p className="text-sm"><span className="font-medium">Username:</span> {selectedRecording.username || 'Unknown'}</p>
                      <p className="text-sm"><span className="font-medium">User ID:</span> {selectedRecording.user_id}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center">
                      <Calendar size={16} className="mr-2 text-primary" />
                      Recording Information
                    </h3>
                    <div className="bg-accent/20 p-3 rounded-md">
                      <p className="text-sm"><span className="font-medium">Date:</span> {formatDate(selectedRecording.recording_date)}</p>
                      <p className="text-sm"><span className="font-medium">Duration:</span> {formatDuration(selectedRecording.duration)}</p>
                      <p className="text-sm"><span className="font-medium">File:</span> {selectedRecording.recording_file_path}</p>
                    </div>
                  </div>
                  
                  {selectedRecording.analysis_complete && (
                    <div className="space-y-2 md:col-span-2">
                      <h3 className="text-sm font-medium flex items-center">
                        <AlertTriangle size={16} className="mr-2 text-primary" />
                        Analysis Results
                      </h3>
                      <div className="bg-accent/20 p-3 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium">Apnea Detected</p>
                            <div className="mt-1">
                              {selectedRecording.is_apnea ? (
                                <Badge variant="destructive" className="text-sm">Yes</Badge>
                              ) : (
                                <Badge variant="default" className="text-sm bg-green-500">No</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Confidence</p>
                            <p className="text-lg font-bold">{selectedRecording.confidence ? `${(selectedRecording.confidence * 100).toFixed(1)}%` : 'N/A'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Severity</p>
                            <p className="text-lg font-bold">{selectedRecording.severity || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <div className="border rounded-md p-4 flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900">
                      <p className="text-muted-foreground">Audio visualization coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRecording(null)}>
                Close
              </Button>
              {selectedRecording && (
                <Button variant="destructive" onClick={() => {
                  setSelectedRecording(selectedRecording);
                  setShowDeleteDialog(true);
                }}>
                  <Trash2 size={14} className="mr-2" />
                  Delete Recording
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={showDeleteDialog} 
          onOpenChange={setShowDeleteDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this recording? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {selectedRecording && (
              <div className="py-4">
                <p className="font-medium">Recording from {selectedRecording.username || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">Recorded on {formatDate(selectedRecording.recording_date)}</p>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDeleteDialog(false);
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteRecording}>
                Delete Recording
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminRecordingsView;
