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

export default function MushroomForm() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    mushroomKind: "",
    csvFile: null as File | null,
  });

  const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "text/csv") {
      setFormData((prev) => ({ ...prev, csvFile: file }));
    } else {
      alert("Please upload a valid CSV file.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <Card className="max-w-xl mx-auto mt-10 shadow-lg">
      <CardHeader>
        <CardTitle>Add a New Mushroom</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Enter mushroom name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Write a description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="mushroomKind">Mushroom Kind</Label>
            <Select
              onValueChange={(value) =>
                setFormData({ ...formData, mushroomKind: value })
              }
            >
              <SelectTrigger id="mushroomKind">
                <SelectValue placeholder="Select kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Oyster">Oyster</SelectItem>
                <SelectItem value="Shiitake">Shiitake</SelectItem>
                <SelectItem value="King Stropharia">King Stropharia</SelectItem>
                <SelectItem value="Enokitake">Enokitake</SelectItem>
                <SelectItem value="King Oyster">King Oyster</SelectItem>
                <SelectItem value="Turkey Tail">Turkey Tail</SelectItem>
                <SelectItem value="Wood Blewit">Wood Blewit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="csvUpload">Upload CSV File</Label>
            <Input
              id="csvUpload"
              type="file"
              accept=".csv"
              onChange={handleCSVChange}
            />
          </div>

          <Button type="submit">Submit</Button>
        </form>
      </CardContent>
    </Card>
  );
}
