import { useState, useRef } from "react";
import { Link } from "wouter";
import { useListDocuments, useDeleteDocument } from "@workspace/api-client-react";
import { uploadDocumentApi } from "@/lib/api-upload";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { FileText, UploadCloud, Search, MoreVertical, Trash2, Loader2, FileCheck2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Documents() {
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useListDocuments();
  const deleteDoc = useDeleteDocument();
  
  const [searchTerm, setSearchTime] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = documents?.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    
    try {
      await uploadDocumentApi(file);
      toast.success("Document uploaded successfully. Processing started.", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
    } catch (err: any) {
      toast.error(err.message || "Upload failed", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteDoc.mutate({ documentId: id }, {
        onSuccess: () => {
          toast.success("Document deleted");
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        },
        onError: () => toast.error("Failed to delete document")
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Library</h1>
          <p className="text-muted-foreground mt-1">Manage and interact with your academic texts.</p>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTime(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="shrink-0"
          >
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            Upload
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.txt,.docx"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={doc.id}
            >
              <Card className="group glass-panel hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${
                        doc.status === 'ready' ? 'bg-primary/20 text-primary' : 
                        doc.status === 'error' ? 'bg-destructive/20 text-destructive' : 
                        'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {doc.status === 'ready' ? <FileCheck2 className="w-6 h-6" /> : 
                         doc.status === 'error' ? <AlertCircle className="w-6 h-6" /> :
                         <Loader2 className="w-6 h-6 animate-spin" />}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel">
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => handleDelete(doc.id, doc.name)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Link href={`/documents/${doc.id}`}>
                      <div className="cursor-pointer">
                        <h3 className="font-semibold text-lg line-clamp-1 mb-1 group-hover:text-primary transition-colors">{doc.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                          <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                          <span>•</span>
                          <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Badge variant={doc.status === 'ready' ? 'default' : doc.status === 'error' ? 'destructive' : 'secondary'} className="capitalize text-[10px]">
                            {doc.status}
                          </Badge>
                          {doc.pageCount && <Badge variant="outline" className="text-[10px]">{doc.pageCount} pages</Badge>}
                        </div>
                      </div>
                    </Link>
                  </div>
                  
                  {doc.status === 'ready' && (
                    <div className="border-t border-border p-4 bg-black/20 flex justify-between gap-2">
                      <Link href={`/documents/${doc.id}?tab=chat`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full text-xs h-8">Chat</Button>
                      </Link>
                      <Link href={`/documents/${doc.id}?tab=quiz`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full text-xs h-8">Quiz</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="glass-panel border-dashed border-2 py-24 px-6 text-center bg-black/10">
          <div className="max-w-sm mx-auto">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <UploadCloud className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No documents found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm ? "Try adjusting your search query." : "Upload your first academic text to start generating summaries, quizzes, and chat sessions."}
            </p>
            {!searchTerm && (
              <Button onClick={() => fileInputRef.current?.click()} className="glow-effect">
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}