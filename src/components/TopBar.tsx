import { Button } from "@/components/ui/button";
import {
  Play,
  Share2,
  Download,
  Settings,
  GitFork,
  Square,
} from "lucide-react";
import { toast } from "sonner";

interface TopBarProps {
  projectName: string;
  isRunning: boolean;
  onRun: () => void;
  onStop: () => void;
  onDownload: () => void;
  onSettingsOpen: () => void;
  onFork: () => void;
}

export default function TopBar({
  projectName,
  isRunning,
  onRun,
  onStop,
  onDownload,
  onSettingsOpen,
  onFork,
}: TopBarProps) {
  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!", {
        description: url,
        duration: 3000,
      });
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="h-12 bg-[#252526] border-b border-[#3E3E42] flex items-center justify-between px-4 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#007ACC] rounded flex items-center justify-center font-bold text-white text-xs">
            ZI
          </div>
          <span className="font-semibold text-sm text-[#CCCCCC]">
            {projectName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isRunning ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStop}
            className="text-[#F44747] hover:bg-[#333333] hover:text-[#F44747] h-8 gap-1"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRun}
            className="text-[#4EC9B0] hover:bg-[#333333] hover:text-[#4EC9B0] h-8 gap-1"
          >
            <Play className="w-3.5 h-3.5" />
            Run
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onFork}
          className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-8 gap-1"
        >
          <GitFork className="w-3.5 h-3.5" />
          Fork
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-8 gap-1"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-8 px-2"
          title="Download project as ZIP"
        >
          <Download className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSettingsOpen}
          className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-8 px-2"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}