import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, List, Link2, GitBranch, FileJson } from "lucide-react";

const STORAGE_KEY = "bpmetrics-welcome-dismissed";

interface WelcomeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WelcomeModal = ({ isOpen, onOpenChange }: WelcomeModalProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the modal before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      onOpenChange(true);
    }
  }, [onOpenChange]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Database className="w-6 h-6 text-primary-foreground" />
            </div>
            <DialogTitle className="text-xl">
              Welcome to bpmetrics Config Builder
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            A tool for configuring metadata extraction from the Bigpicture MSMdad 
            (Mandatory Submission Metadata for Directly Accessible Datasets) schema 
            — the standardized metadata structure for the European medical imaging initiative.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <h4 className="font-semibold text-foreground">Quick Start</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                <List className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Schema Explorer</p>
                <p className="text-sm text-muted-foreground">
                  Browse entity types (Dataset, Image, Specimen, etc.) and select 
                  attributes for extraction.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Connection Explorer</p>
                <p className="text-sm text-muted-foreground">
                  Build compound metrics by traversing relationships between entities.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Reference Graph</p>
                <p className="text-sm text-muted-foreground">
                  Visualize how all entities connect through references.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
              <FileJson className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Output</p>
              <p className="text-sm text-muted-foreground">
                Generate a JSON configuration file for the bpmetrics extraction tool.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label
              htmlFor="dont-show"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don't show again
            </label>
          </div>
          <Button onClick={handleClose} className="sm:ml-auto">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
