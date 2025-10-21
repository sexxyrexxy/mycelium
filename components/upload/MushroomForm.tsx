"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  name: string;
  description: string;
  mushroomKind: string;
  csvFile: File | null;
};

export default function MushroomForm() {
  const [formData, setFormData] = useState<FormState>({
    name: "",
    description: "",
    mushroomKind: "",
    csvFile: null,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "text/csv") {
      setFormData((prev) => ({ ...prev, csvFile: file }));
    } else {
      alert("Please upload a valid CSV file.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.csvFile || !formData.name || !formData.mushroomKind) {
      alert("Please fill out all fields and upload a CSV.");
      return;
    }

    try {
      setLoading(true);

      const body = new FormData();
      body.append("file", formData.csvFile);
      body.append("name", formData.name);
      body.append("description", formData.description);
      body.append("kind", formData.mushroomKind);
      body.append("userId", "demo-user-123"); // 🔑 replace with real userId / auth later

      const res = await fetch("/api/mushrooms/", {
        method: "POST",
        body,
      });

      const json = (await res.json()) as Record<string, unknown> | null;
      setResult(json);

      if (!res.ok) {
        const message = typeof json?.error === "string" ? json.error : "Unknown error";
        alert("Upload failed: " + message);
      } else {
        alert("Mushroom uploaded successfully!");
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unexpected error";
      alert("Unexpected error: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto mt-10 shadow-lg">
      <CardHeader>
        <CardTitle>Add a New Mushroom</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Description */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          {/* Kind */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="mushroomKind">Mushroom Kind</Label>
            <Select
              value={formData.mushroomKind}
              onValueChange={(value) =>
                setFormData({ ...formData, mushroomKind: value })
              }
            >
              <SelectTrigger id="mushroomKind">
                <SelectValue placeholder="Select kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oyster">Oyster</SelectItem>
                <SelectItem value="Shiitake">Shiitake</SelectItem>
                <SelectItem value="Enokitake">Enokitake</SelectItem>
                <SelectItem value="King Oyster">King Oyster</SelectItem>
                <SelectItem value="Ghost Fungi">Ghost Fungi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CSV */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="csvUpload">Upload CSV File</Label>
            <Input
              id="csvUpload"
              type="file"
              accept=".csv"
              onChange={handleCSVChange}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Uploading..." : "Submit"}
          </Button>
        </form>

        {/* Debug Output */}
        {result && (
          <pre className="mt-6 p-4 bg-gray-100 text-sm rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
