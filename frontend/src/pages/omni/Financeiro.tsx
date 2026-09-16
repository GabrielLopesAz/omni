import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function ModuloEmDesenvolvimento() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 flex h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="border-dashed border-2 bg-muted/20 w-full max-w-3xl">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 bg-background border shadow-sm rounded-full flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Módulo em Desenvolvimento</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Esta funcionalidade está em fase de estruturação. Em breve estará disponível no OMNI ERP.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
