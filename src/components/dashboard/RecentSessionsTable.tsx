import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Session {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  status: string;
  session_type?: string;
}

interface RecentSessionsTableProps {
  sessions: Session[];
}

export default function RecentSessionsTable({ sessions }: RecentSessionsTableProps) {
  const navigate = useNavigate();

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "disc":
        return "bg-yellow-500/20 text-yellow-400";
      case "coach":
      default:
        return "bg-primary/20 text-primary";
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Recent Sessions</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground">DATE</TableHead>
            <TableHead className="text-xs text-muted-foreground">TYPE</TableHead>
            <TableHead className="text-xs text-muted-foreground">DURATION</TableHead>
            <TableHead className="text-xs text-muted-foreground">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.slice(0, 5).map((session) => (
            <TableRow key={session.id} className="hover:bg-muted/30">
              <TableCell className="text-sm">
                {format(new Date(session.started_at), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${getTypeColor(
                    session.session_type
                  )}`}
                >
                  {session.session_type || "coach"}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDuration(session.duration_seconds)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigate(`/dashboard/sessions?id=${session.id}`)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
