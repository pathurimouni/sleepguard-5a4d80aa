
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { FileText, Search, Download, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { fetchAllRecordings } from "@/utils/adminApi";
import { supabase } from "@/integrations/supabase/client";

const AdminRecordingsView = () => {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    loadRecordings();
    
    // Setup realtime subscription for recordings and analysis
    const recordingsChannel = supabase
      .channel('admin-recordings-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'breathing_recordings' 
      }, () => {
        loadRecordings();
      })
      .subscribe();
      
    const analysisChannel = supabase
      .channel('admin-analysis-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'apnea_analysis' 
      }, () => {
        loadRecordings();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(recordingsChannel);
      supabase.removeChannel(analysisChannel);
    };
  }, []);

  useEffect(() => {
    filterRecordings();
  }, [searchQuery, recordings, activeFilter]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const data = await fetchAllRecordings();
      setRecordings(data);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  };

  const filterRecordings = () => {
    let filtered = recordings;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(rec => 
        rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply tab filter
    if (activeFilter === 'analyzed') {
      filtered = filtered.filter(rec => rec.analysis_complete);
    } else if (activeFilter === 'pending') {
      filtered = filtered.filter(rec => !rec.analysis_complete);
    }
    
    setFilteredRecordings(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <FileText className="mr-2" size={20} />
          Recordings Management
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search" 
              placeholder="Search recordings..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="sm:w-auto w-full">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Recordings</TabsTrigger>
            <TabsTrigger value="analyzed">Analyzed</TabsTrigger>
            <TabsTrigger value="pending">Pending Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeFilter}>
            {loading ? (
              <div className="flex flex-col gap-4 py-8">
                <div className="text-center text-muted-foreground">Loading recordings...</div>
                <Progress value={60} className="w-full" />
              </div>
            ) : filteredRecordings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
                No recordings found
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Recording ID</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Duration</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecordings.map((recording) => (
                        <tr key={recording.id} className="border-t hover:bg-muted/50">
                          <td className="p-3">{recording.profiles?.username || 'Unknown user'}</td>
                          <td className="p-3 font-mono text-sm">{recording.id.substring(0, 8)}...</td>
                          <td className="p-3">{formatDate(recording.recording_date)}</td>
                          <td className="p-3">{recording.duration}s</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              recording.analysis_complete 
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                            }`}>
                              {recording.analysis_complete ? "Analyzed" : "Pending"}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminRecordingsView;
