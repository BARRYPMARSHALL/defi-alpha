import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, ChevronDown, ChevronRight, BookOpen, Clock } from "lucide-react";

interface CourseModuleProps {
  id: string;
  title: string;
  description: string;
  duration: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const STORAGE_KEY = "defi-course-progress";

function getCourseProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCourseProgress(progress: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function CourseModule({ id, title, description, duration, children, defaultOpen = false }: CourseModuleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const progress = getCourseProgress();
    setCompleted(progress[id] === true);
  }, [id]);

  const handleComplete = () => {
    const progress = getCourseProgress();
    progress[id] = true;
    saveCourseProgress(progress);
    setCompleted(true);
  };

  const handleUncomplete = () => {
    const progress = getCourseProgress();
    delete progress[id];
    saveCourseProgress(progress);
    setCompleted(false);
  };

  return (
    <Card className={`transition-all ${completed ? "border-chart-2/50 bg-chart-2/5" : ""}`} data-testid={`course-module-${id}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate rounded-t-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${completed ? "bg-chart-2 text-white" : "bg-muted"}`}>
                  {completed ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <BookOpen className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {title}
                    {completed && (
                      <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30 text-xs">
                        Completed
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {duration}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 pb-8 px-6 sm:px-8">
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
              {children}
            </div>
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {completed ? (
                <Button variant="outline" size="sm" onClick={handleUncomplete} data-testid={`button-uncomplete-${id}`}>
                  Mark as Incomplete
                </Button>
              ) : (
                <Button onClick={handleComplete} className="bg-chart-2" data-testid={`button-complete-${id}`}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function CourseProgress() {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProgress(getCourseProgress());
    setMounted(true);

    const handleStorage = () => {
      setProgress(getCourseProgress());
    };

    window.addEventListener("storage", handleStorage);
    const interval = setInterval(handleStorage, 1000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (!mounted) return null;

  const totalModules = 6;
  const completedCount = Object.values(progress).filter(Boolean).length;
  const percentage = Math.round((completedCount / totalModules) * 100);

  return (
    <Card data-testid="course-progress-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Course Progress</span>
          <span className="text-sm text-muted-foreground">{completedCount}/{totalModules} modules</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-chart-2 transition-all duration-500" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        {completedCount === totalModules && (
          <div className="mt-3 flex items-center gap-2 text-chart-2">
            <Badge className="bg-chart-2 text-white">
              <Check className="h-3 w-3 mr-1" />
              DeFi Alpha Graduate
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
