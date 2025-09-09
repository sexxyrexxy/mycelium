import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

interface MushroomCardProps {
  img: string;
  name: string;
  species: string;
  description?: string;
  href?: string;
}

const MushroomCard: React.FC<MushroomCardProps> = ({
  img,
  name,
  species,
  description,
  href = "/product/",
}) => {
  return (
    <Card className="w-full max-w-sm pt-0">
      {/* Image / Link */}
      <CardHeader className="!p-0 relative h-60">
        <Link href={href}>
          <Image
            src={img}
            alt={name}
            fill
            className="object-cover rounded-t-xl"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        </Link>
      </CardHeader>

      {/* Card Content */}
      <CardContent
        className="p-4 grid gap-4"
        //style={{ backgroundColor: "#AAA432" }}
      >
        <div>
          <h2 className="text-m">{name}</h2>
          <p className="text-xs">{species}</p>
        </div>

        <div className="flex justify-between items-center gap-4">
          <p className="text-xs">{description || `Info about ${name}`}</p>

          {/* Grow button navigates using router */}
          <Button asChild>
            <Link href={`/grow/${name.toLowerCase().replace(/\s+/g, "")}`}>
              Grow
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MushroomCard;
