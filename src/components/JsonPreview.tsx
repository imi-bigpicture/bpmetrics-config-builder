import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface JsonPreviewProps {
  config: unknown;
  onClose: () => void;
}

export const JsonPreview = ({ config, onClose }: JsonPreviewProps) => {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(config, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">JSON Configuration Preview</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review your bpmetrics configuration
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-code">
          <pre className="text-code-foreground text-sm font-mono">
            {jsonString}
          </pre>
        </div>
      </Card>
    </div>
  );
};
